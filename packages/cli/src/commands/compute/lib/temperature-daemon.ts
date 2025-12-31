/**
 * System Metrics Daemon Manager
 *
 * Manages an optional LaunchDaemon for reading system metrics on macOS.
 * This is needed because many sensors require elevated privileges on Apple Silicon.
 *
 * The daemon:
 * - Runs as root via launchd
 * - Reads metrics every 5 seconds using powermetrics
 * - Writes data to ~/.nexus/temperature.json (readable by user)
 * - Captures: temperature, power consumption, GPU/CPU frequencies, battery, thermal state
 *
 * Installation requires one-time sudo, but the main agent runs as normal user.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DAEMON_LABEL = 'ai.adverant.nexus.temperature';
const DAEMON_PLIST_PATH = `/Library/LaunchDaemons/${DAEMON_LABEL}.plist`;
const DAEMON_SCRIPT_PATH = '/usr/local/bin/nexus-temperature-reader';
const TEMPERATURE_FILE = path.join(os.homedir(), '.nexus', 'temperature.json');

/**
 * Extended system metrics data structure written by daemon
 */
export interface TemperatureData {
  timestamp: string;
  // Temperature (legacy fields for compatibility)
  cpu?: number;
  gpu?: number;
  soc?: number;  // System on Chip (Apple Silicon)
  thermalState?: string;  // Nominal, Fair, Serious, Critical

  // Power consumption (milliwatts)
  power?: {
    cpu?: number;      // CPU power in mW
    gpu?: number;      // GPU power in mW
    ane?: number;      // Apple Neural Engine power in mW
    combined?: number; // Total CPU + GPU + ANE
  };

  // GPU metrics
  gpuMetrics?: {
    activeFrequencyMHz?: number;  // Current GPU frequency
    activeResidency?: number;     // GPU utilization % (0-100)
    idleResidency?: number;       // GPU idle %
  };

  // CPU cluster metrics
  cpuMetrics?: {
    eClusterFreqMHz?: number;     // Efficiency cluster frequency
    eClusterActive?: number;      // E-cluster active %
    pClusterFreqMHz?: number;     // Performance cluster frequency
    pClusterActive?: number;      // P-cluster active %
  };

  // Battery info
  battery?: {
    percentCharge?: number;       // 0-100
  };

  // Network I/O
  network?: {
    inBytesPerSec?: number;
    outBytesPerSec?: number;
  };

  // Disk I/O
  disk?: {
    readOpsPerSec?: number;
    writeOpsPerSec?: number;
    readKBytesPerSec?: number;
    writeKBytesPerSec?: number;
  };

  error?: string;
}

/**
 * Check if the temperature daemon is installed
 */
export function isDaemonInstalled(): boolean {
  try {
    return fs.existsSync(DAEMON_PLIST_PATH) && fs.existsSync(DAEMON_SCRIPT_PATH);
  } catch {
    return false;
  }
}

/**
 * Check if the temperature daemon is running
 */
export function isDaemonRunning(): boolean {
  try {
    const result = execSync(`launchctl list | grep ${DAEMON_LABEL}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return result.includes(DAEMON_LABEL);
  } catch {
    return false;
  }
}

/**
 * Read temperature from the daemon's output file
 * Returns null if daemon is not installed or file doesn't exist
 */
export function readTemperatureFromDaemon(): TemperatureData | null {
  try {
    if (!fs.existsSync(TEMPERATURE_FILE)) {
      return null;
    }

    const content = fs.readFileSync(TEMPERATURE_FILE, 'utf-8');
    const data: TemperatureData = JSON.parse(content);

    // Check if data is stale (older than 30 seconds)
    const timestamp = new Date(data.timestamp);
    const age = Date.now() - timestamp.getTime();
    if (age > 30000) {
      return null; // Data too old, daemon might have stopped
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Generate the system metrics reader script content
 * This script runs as root and writes comprehensive metrics to a user-readable file
 */
function generateDaemonScript(userId: number, groupId: number, homeDir: string): string {
  return `#!/bin/bash
# Nexus System Metrics Daemon
# Reads comprehensive system metrics and writes to user's .nexus directory
# This script runs as root to access sensors via powermetrics

TEMP_FILE="${homeDir}/.nexus/temperature.json"
INTERVAL=5

# Ensure .nexus directory exists with correct permissions
mkdir -p "${homeDir}/.nexus"
chown ${userId}:${groupId} "${homeDir}/.nexus"

write_metrics() {
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Initialize all variables
  local soc_temp=""
  local thermal_state=""
  local cpu_power="" gpu_power="" ane_power="" combined_power=""
  local gpu_freq="" gpu_active="" gpu_idle=""
  local e_cluster_freq="" e_cluster_active="" p_cluster_freq="" p_cluster_active=""
  local battery_percent=""
  local net_in="" net_out=""
  local disk_read_ops="" disk_write_ops="" disk_read_kb="" disk_write_kb=""

  # Run powermetrics once with all samplers we need
  if command -v powermetrics &> /dev/null; then
    local pm_output
    pm_output=$(powermetrics --samplers thermal,cpu_power,gpu_power,battery,network,disk -i 1 -n 1 2>/dev/null || true)

    # === THERMAL STATE ===
    local thermal_level
    thermal_level=$(echo "$pm_output" | grep -i "pressure level" | head -1 | awk '{print $NF}')
    if [ -n "$thermal_level" ]; then
      thermal_state="$thermal_level"
      case "$thermal_level" in
        "Nominal") soc_temp="42" ;;
        "Fair") soc_temp="65" ;;
        "Serious") soc_temp="85" ;;
        "Critical") soc_temp="95" ;;
      esac
    fi

    # === POWER CONSUMPTION ===
    cpu_power=$(echo "$pm_output" | grep "^CPU Power:" | head -1 | grep -oE '[0-9]+' | head -1)
    gpu_power=$(echo "$pm_output" | grep "^GPU Power:" | head -1 | grep -oE '[0-9]+' | head -1)
    ane_power=$(echo "$pm_output" | grep "^ANE Power:" | head -1 | grep -oE '[0-9]+' | head -1)
    combined_power=$(echo "$pm_output" | grep "Combined Power" | head -1 | grep -oE '[0-9]+' | head -1)

    # === GPU METRICS ===
    gpu_freq=$(echo "$pm_output" | grep "GPU HW active frequency:" | head -1 | grep -oE '[0-9]+' | head -1)
    gpu_active=$(echo "$pm_output" | grep "GPU HW active residency:" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)
    gpu_idle=$(echo "$pm_output" | grep "GPU idle residency:" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)

    # === CPU CLUSTER METRICS ===
    e_cluster_freq=$(echo "$pm_output" | grep "E-Cluster HW active frequency:" | head -1 | grep -oE '[0-9]+' | head -1)
    e_cluster_active=$(echo "$pm_output" | grep "E-Cluster HW active residency:" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)
    # Get P1-Cluster (performance cores) - M4 has P0 and P1 clusters
    p_cluster_freq=$(echo "$pm_output" | grep "P1-Cluster HW active frequency:" | head -1 | grep -oE '[0-9]+' | head -1)
    if [ -z "$p_cluster_freq" ]; then
      p_cluster_freq=$(echo "$pm_output" | grep "P0-Cluster HW active frequency:" | head -1 | grep -oE '[0-9]+' | head -1)
    fi
    p_cluster_active=$(echo "$pm_output" | grep "P1-Cluster HW active residency:" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)
    if [ -z "$p_cluster_active" ]; then
      p_cluster_active=$(echo "$pm_output" | grep "P0-Cluster HW active residency:" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)
    fi

    # === BATTERY ===
    battery_percent=$(echo "$pm_output" | grep "percent_charge:" | head -1 | grep -oE '[0-9]+' | head -1)

    # === NETWORK I/O ===
    net_in=$(echo "$pm_output" | grep "^in:" | head -1 | awk '{print $4}' | grep -oE '[0-9]+\\.?[0-9]*')
    net_out=$(echo "$pm_output" | grep "^out:" | head -1 | awk '{print $4}' | grep -oE '[0-9]+\\.?[0-9]*')

    # === DISK I/O ===
    disk_read_ops=$(echo "$pm_output" | grep "^read:" | head -1 | awk '{print $2}' | grep -oE '[0-9]+\\.?[0-9]*')
    disk_read_kb=$(echo "$pm_output" | grep "^read:" | head -1 | awk '{print $4}' | grep -oE '[0-9]+\\.?[0-9]*')
    disk_write_ops=$(echo "$pm_output" | grep "^write:" | head -1 | awk '{print $2}' | grep -oE '[0-9]+\\.?[0-9]*')
    disk_write_kb=$(echo "$pm_output" | grep "^write:" | head -1 | awk '{print $4}' | grep -oE '[0-9]+\\.?[0-9]*')
  fi

  # Build JSON output
  local json="{"
  json+="\\"timestamp\\":\\"$timestamp\\""

  # Temperature (legacy compatibility)
  if [ -n "$soc_temp" ]; then
    json+=",\\"soc\\":$soc_temp"
  fi
  if [ -n "$thermal_state" ]; then
    json+=",\\"thermalState\\":\\"$thermal_state\\""
  fi

  # Power object
  if [ -n "$cpu_power" ] || [ -n "$gpu_power" ] || [ -n "$ane_power" ]; then
    json+=",\\"power\\":{"
    local power_first=true
    if [ -n "$cpu_power" ]; then
      json+="\\"cpu\\":$cpu_power"
      power_first=false
    fi
    if [ -n "$gpu_power" ]; then
      [ "$power_first" = false ] && json+=","
      json+="\\"gpu\\":$gpu_power"
      power_first=false
    fi
    if [ -n "$ane_power" ]; then
      [ "$power_first" = false ] && json+=","
      json+="\\"ane\\":$ane_power"
      power_first=false
    fi
    if [ -n "$combined_power" ]; then
      [ "$power_first" = false ] && json+=","
      json+="\\"combined\\":$combined_power"
    fi
    json+="}"
  fi

  # GPU metrics object
  if [ -n "$gpu_freq" ] || [ -n "$gpu_active" ]; then
    json+=",\\"gpuMetrics\\":{"
    local gpu_first=true
    if [ -n "$gpu_freq" ]; then
      json+="\\"activeFrequencyMHz\\":$gpu_freq"
      gpu_first=false
    fi
    if [ -n "$gpu_active" ]; then
      [ "$gpu_first" = false ] && json+=","
      json+="\\"activeResidency\\":$gpu_active"
      gpu_first=false
    fi
    if [ -n "$gpu_idle" ]; then
      [ "$gpu_first" = false ] && json+=","
      json+="\\"idleResidency\\":$gpu_idle"
    fi
    json+="}"
  fi

  # CPU metrics object
  if [ -n "$e_cluster_freq" ] || [ -n "$p_cluster_freq" ]; then
    json+=",\\"cpuMetrics\\":{"
    local cpu_first=true
    if [ -n "$e_cluster_freq" ]; then
      json+="\\"eClusterFreqMHz\\":$e_cluster_freq"
      cpu_first=false
    fi
    if [ -n "$e_cluster_active" ]; then
      [ "$cpu_first" = false ] && json+=","
      json+="\\"eClusterActive\\":$e_cluster_active"
      cpu_first=false
    fi
    if [ -n "$p_cluster_freq" ]; then
      [ "$cpu_first" = false ] && json+=","
      json+="\\"pClusterFreqMHz\\":$p_cluster_freq"
      cpu_first=false
    fi
    if [ -n "$p_cluster_active" ]; then
      [ "$cpu_first" = false ] && json+=","
      json+="\\"pClusterActive\\":$p_cluster_active"
    fi
    json+="}"
  fi

  # Battery object
  if [ -n "$battery_percent" ]; then
    json+=",\\"battery\\":{\\"percentCharge\\":$battery_percent}"
  fi

  # Network object
  if [ -n "$net_in" ] || [ -n "$net_out" ]; then
    json+=",\\"network\\":{"
    local net_first=true
    if [ -n "$net_in" ]; then
      json+="\\"inBytesPerSec\\":$net_in"
      net_first=false
    fi
    if [ -n "$net_out" ]; then
      [ "$net_first" = false ] && json+=","
      json+="\\"outBytesPerSec\\":$net_out"
    fi
    json+="}"
  fi

  # Disk object
  if [ -n "$disk_read_ops" ] || [ -n "$disk_write_ops" ]; then
    json+=",\\"disk\\":{"
    local disk_first=true
    if [ -n "$disk_read_ops" ]; then
      json+="\\"readOpsPerSec\\":$disk_read_ops"
      disk_first=false
    fi
    if [ -n "$disk_write_ops" ]; then
      [ "$disk_first" = false ] && json+=","
      json+="\\"writeOpsPerSec\\":$disk_write_ops"
      disk_first=false
    fi
    if [ -n "$disk_read_kb" ]; then
      [ "$disk_first" = false ] && json+=","
      json+="\\"readKBytesPerSec\\":$disk_read_kb"
      disk_first=false
    fi
    if [ -n "$disk_write_kb" ]; then
      [ "$disk_first" = false ] && json+=","
      json+="\\"writeKBytesPerSec\\":$disk_write_kb"
    fi
    json+="}"
  fi

  json+="}"

  # Write to file with correct permissions
  echo "$json" > "$TEMP_FILE"
  chown ${userId}:${groupId} "$TEMP_FILE"
  chmod 644 "$TEMP_FILE"
}

# Main loop
while true; do
  write_metrics
  sleep $INTERVAL
done
`;
}

/**
 * Generate the LaunchDaemon plist content
 */
function generatePlist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${DAEMON_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${DAEMON_SCRIPT_PATH}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/var/log/nexus-temperature.err</string>
    <key>StandardOutPath</key>
    <string>/var/log/nexus-temperature.log</string>
</dict>
</plist>
`;
}

/**
 * Install the temperature daemon (requires sudo)
 */
export async function installDaemon(): Promise<{ success: boolean; message: string }> {
  // Check if already installed
  if (isDaemonInstalled()) {
    return { success: true, message: 'Temperature daemon is already installed' };
  }

  // Only supported on macOS
  if (process.platform !== 'darwin') {
    return { success: false, message: 'Temperature daemon is only supported on macOS' };
  }

  // Get user info for file permissions
  const userId = process.getuid?.() ?? 501;
  const groupId = process.getgid?.() ?? 20;
  const homeDir = os.homedir();

  // Generate scripts
  const daemonScript = generateDaemonScript(userId, groupId, homeDir);
  const plist = generatePlist();

  // Create temporary files
  const tmpScript = `/tmp/nexus-temp-reader-${Date.now()}.sh`;
  const tmpPlist = `/tmp/nexus-temp-plist-${Date.now()}.plist`;

  try {
    // Write temporary files
    fs.writeFileSync(tmpScript, daemonScript, { mode: 0o755 });
    fs.writeFileSync(tmpPlist, plist, { mode: 0o644 });

    // Create install script that will be run with sudo
    const installScript = `
#!/bin/bash
set -e

# Copy daemon script
cp "${tmpScript}" "${DAEMON_SCRIPT_PATH}"
chmod 755 "${DAEMON_SCRIPT_PATH}"
chown root:wheel "${DAEMON_SCRIPT_PATH}"

# Copy plist
cp "${tmpPlist}" "${DAEMON_PLIST_PATH}"
chmod 644 "${DAEMON_PLIST_PATH}"
chown root:wheel "${DAEMON_PLIST_PATH}"

# Load the daemon
launchctl load -w "${DAEMON_PLIST_PATH}"

# Clean up temp files
rm -f "${tmpScript}" "${tmpPlist}"

echo "Temperature daemon installed successfully"
`;

    const tmpInstallScript = `/tmp/nexus-install-daemon-${Date.now()}.sh`;
    fs.writeFileSync(tmpInstallScript, installScript, { mode: 0o755 });

    // Run the install script with sudo
    console.log('\nInstalling temperature daemon...');
    console.log('This requires administrator privileges to install a system service.\n');

    execSync(`sudo bash "${tmpInstallScript}"`, {
      stdio: 'inherit',
    });

    // Clean up
    try {
      fs.unlinkSync(tmpInstallScript);
    } catch {
      // Ignore cleanup errors
    }

    // Ensure .nexus directory exists
    const nexusDir = path.join(homeDir, '.nexus');
    if (!fs.existsSync(nexusDir)) {
      fs.mkdirSync(nexusDir, { recursive: true });
    }

    // Wait a moment for daemon to start and write first reading
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify it's working
    const temp = readTemperatureFromDaemon();
    if (temp) {
      return {
        success: true,
        message: `Temperature daemon installed and running. Current reading: ${temp.cpu || temp.soc || 'N/A'}°C`,
      };
    }

    return {
      success: true,
      message: 'Temperature daemon installed. It may take a few seconds to start reporting.',
    };
  } catch (error) {
    // Clean up temp files on error
    try {
      fs.unlinkSync(tmpScript);
      fs.unlinkSync(tmpPlist);
    } catch {
      // Ignore cleanup errors
    }

    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to install daemon: ${message}` };
  }
}

/**
 * Uninstall the temperature daemon (requires sudo)
 */
export async function uninstallDaemon(): Promise<{ success: boolean; message: string }> {
  if (!isDaemonInstalled()) {
    return { success: true, message: 'Temperature daemon is not installed' };
  }

  try {
    const uninstallScript = `
#!/bin/bash
set -e

# Stop and unload the daemon
if launchctl list | grep -q "${DAEMON_LABEL}"; then
  launchctl unload -w "${DAEMON_PLIST_PATH}" 2>/dev/null || true
fi

# Remove files
rm -f "${DAEMON_PLIST_PATH}"
rm -f "${DAEMON_SCRIPT_PATH}"
rm -f /var/log/nexus-temperature.log
rm -f /var/log/nexus-temperature.err

echo "Temperature daemon uninstalled successfully"
`;

    const tmpUninstallScript = `/tmp/nexus-uninstall-daemon-${Date.now()}.sh`;
    fs.writeFileSync(tmpUninstallScript, uninstallScript, { mode: 0o755 });

    console.log('\nUninstalling temperature daemon...');
    console.log('This requires administrator privileges.\n');

    execSync(`sudo bash "${tmpUninstallScript}"`, {
      stdio: 'inherit',
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tmpUninstallScript);
    } catch {
      // Ignore
    }

    // Remove local temperature file
    try {
      fs.unlinkSync(TEMPERATURE_FILE);
    } catch {
      // Ignore if doesn't exist
    }

    return { success: true, message: 'Temperature daemon uninstalled successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to uninstall daemon: ${message}` };
  }
}

/**
 * Get daemon status information
 */
export function getDaemonStatus(): {
  installed: boolean;
  running: boolean;
  lastReading: TemperatureData | null;
} {
  return {
    installed: isDaemonInstalled(),
    running: isDaemonRunning(),
    lastReading: readTemperatureFromDaemon(),
  };
}
