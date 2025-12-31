/**
 * Temperature Daemon Manager
 *
 * Manages an optional LaunchDaemon for reading CPU/GPU temperature on macOS.
 * This is needed because temperature sensors require elevated privileges on Apple Silicon.
 *
 * The daemon:
 * - Runs as root via launchd
 * - Reads temperature every 5 seconds using powermetrics
 * - Writes temperature to ~/.nexus/temperature.json (readable by user)
 * - Minimal footprint, only reads sensors
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
 * Temperature data structure written by daemon
 */
export interface TemperatureData {
  timestamp: string;
  cpu?: number;
  gpu?: number;
  soc?: number;  // System on Chip (Apple Silicon)
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
 * Generate the temperature reader script content
 * This script runs as root and writes temperature to a user-readable file
 */
function generateDaemonScript(userId: number, groupId: number, homeDir: string): string {
  return `#!/bin/bash
# Nexus Temperature Reader Daemon
# Reads CPU/GPU temperature and writes to user's .nexus directory
# This script runs as root to access temperature sensors

TEMP_FILE="${homeDir}/.nexus/temperature.json"
INTERVAL=5

# Ensure .nexus directory exists with correct permissions
mkdir -p "${homeDir}/.nexus"
chown ${userId}:${groupId} "${homeDir}/.nexus"

write_temperature() {
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local cpu_temp=""
  local gpu_temp=""
  local soc_temp=""
  local error=""

  # Try powermetrics for Apple Silicon (most accurate)
  if command -v powermetrics &> /dev/null; then
    # Run powermetrics for 1 sample, extract thermal data
    local pm_output
    pm_output=$(powermetrics --samplers smc -i 1 -n 1 2>/dev/null || true)

    # Extract CPU die temperature
    cpu_temp=$(echo "$pm_output" | grep -i "CPU die temperature" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)

    # Extract GPU die temperature (if available)
    gpu_temp=$(echo "$pm_output" | grep -i "GPU die temperature" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)

    # Extract SOC temperature (Apple Silicon)
    soc_temp=$(echo "$pm_output" | grep -i "SOC MTR Temp" | head -1 | grep -oE '[0-9]+\\.?[0-9]*' | head -1)

    # If no specific temps found, try generic thermal pressure
    if [ -z "$cpu_temp" ] && [ -z "$soc_temp" ]; then
      # Fallback: try to get any temperature reading
      local any_temp
      any_temp=$(echo "$pm_output" | grep -iE "temperature|thermal" | grep -oE '[0-9]+\\.?[0-9]*' | head -1)
      if [ -n "$any_temp" ]; then
        cpu_temp="$any_temp"
      fi
    fi
  fi

  # Build JSON output
  local json="{"
  json+="\\"timestamp\\":\\"$timestamp\\""

  if [ -n "$cpu_temp" ]; then
    json+=",\\"cpu\\":$cpu_temp"
  fi

  if [ -n "$gpu_temp" ]; then
    json+=",\\"gpu\\":$gpu_temp"
  fi

  if [ -n "$soc_temp" ]; then
    json+=",\\"soc\\":$soc_temp"
  fi

  if [ -z "$cpu_temp" ] && [ -z "$gpu_temp" ] && [ -z "$soc_temp" ]; then
    json+=",\\"error\\":\\"No temperature sensors found\\""
  fi

  json+="}"

  # Write to file with correct permissions
  echo "$json" > "$TEMP_FILE"
  chown ${userId}:${groupId} "$TEMP_FILE"
  chmod 644 "$TEMP_FILE"
}

# Main loop
while true; do
  write_temperature
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
