/**
 * Hardware Detection Module
 *
 * Detects local hardware capabilities including:
 * - Apple Silicon (M1/M2/M3/M4 series)
 * - NVIDIA GPUs
 * - CPU cores and memory
 * - Installed ML frameworks
 */

import os from 'os';
import { execSync } from 'child_process';
import { readTemperatureFromDaemon } from './temperature-daemon.js';

export interface HardwareInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpu: CPUInfo;
  memory: MemoryInfo;
  gpu: GPUInfo | null;
  frameworks: FrameworkInfo[];
}

export interface CPUInfo {
  model: string;
  cores: number;
  performanceCores?: number;
  efficiencyCores?: number;
  speed?: number;
}

export interface MemoryInfo {
  total: number;
  available: number;
  unified: boolean;
}

export interface GPUInfo {
  type: string;
  memory: number;
  api: string;
  fp32Tflops?: number;
  fp16Tflops?: number;
  computeCapability?: string;
  neuralEngine?: boolean;
  neuralEngineTops?: number;
}

export interface FrameworkInfo {
  name: string;
  version?: string;
  available: boolean;
  gpuSupport: boolean;
}

/**
 * Apple Silicon GPU Specifications
 */
const APPLE_SILICON_SPECS: Record<string, Partial<GPUInfo>> = {
  'Apple M1': {
    memory: 16,
    fp32Tflops: 2.6,
    fp16Tflops: 5.2,
    neuralEngine: true,
    neuralEngineTops: 11,
    api: 'Metal 3',
  },
  'Apple M1 Pro': {
    memory: 32,
    fp32Tflops: 5.2,
    fp16Tflops: 10.4,
    neuralEngine: true,
    neuralEngineTops: 11,
    api: 'Metal 3',
  },
  'Apple M1 Max': {
    memory: 64,
    fp32Tflops: 10.4,
    fp16Tflops: 20.8,
    neuralEngine: true,
    neuralEngineTops: 11,
    api: 'Metal 3',
  },
  'Apple M1 Ultra': {
    memory: 128,
    fp32Tflops: 20.8,
    fp16Tflops: 41.6,
    neuralEngine: true,
    neuralEngineTops: 22,
    api: 'Metal 3',
  },
  'Apple M2': {
    memory: 24,
    fp32Tflops: 3.6,
    fp16Tflops: 7.2,
    neuralEngine: true,
    neuralEngineTops: 15.8,
    api: 'Metal 3',
  },
  'Apple M2 Pro': {
    memory: 32,
    fp32Tflops: 6.8,
    fp16Tflops: 13.6,
    neuralEngine: true,
    neuralEngineTops: 15.8,
    api: 'Metal 3',
  },
  'Apple M2 Max': {
    memory: 96,
    fp32Tflops: 13.6,
    fp16Tflops: 27.2,
    neuralEngine: true,
    neuralEngineTops: 15.8,
    api: 'Metal 3',
  },
  'Apple M2 Ultra': {
    memory: 192,
    fp32Tflops: 27.2,
    fp16Tflops: 54.4,
    neuralEngine: true,
    neuralEngineTops: 31.6,
    api: 'Metal 3',
  },
  'Apple M3': {
    memory: 24,
    fp32Tflops: 4.0,
    fp16Tflops: 8.0,
    neuralEngine: true,
    neuralEngineTops: 18,
    api: 'Metal 3',
  },
  'Apple M3 Pro': {
    memory: 36,
    fp32Tflops: 7.5,
    fp16Tflops: 15.0,
    neuralEngine: true,
    neuralEngineTops: 18,
    api: 'Metal 3',
  },
  'Apple M3 Max': {
    memory: 128,
    fp32Tflops: 14.2,
    fp16Tflops: 28.4,
    neuralEngine: true,
    neuralEngineTops: 18,
    api: 'Metal 3',
  },
  'Apple M4': {
    memory: 32,
    fp32Tflops: 5.3,
    fp16Tflops: 10.6,
    neuralEngine: true,
    neuralEngineTops: 38,
    api: 'Metal 3',
  },
  'Apple M4 Pro': {
    memory: 48,
    fp32Tflops: 12.0,
    fp16Tflops: 24.0,
    neuralEngine: true,
    neuralEngineTops: 38,
    api: 'Metal 3',
  },
  'Apple M4 Max': {
    memory: 128,
    fp32Tflops: 18.0,
    fp16Tflops: 36.0,
    neuralEngine: true,
    neuralEngineTops: 38,
    api: 'Metal 3',
  },
};

/**
 * Detect all hardware information
 */
export async function detectHardware(): Promise<HardwareInfo> {
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();

  const cpu = detectCPU();
  const memory = detectMemory();
  const gpu = await detectGPU();
  const frameworks = await detectFrameworks();

  return {
    platform,
    arch,
    hostname,
    cpu,
    memory,
    gpu,
    frameworks,
  };
}

/**
 * Detect CPU information
 */
function detectCPU(): CPUInfo {
  const cpus = os.cpus();
  const model = cpus[0]?.model || 'Unknown';
  const cores = cpus.length;
  const speed = cpus[0]?.speed;

  // Detect Apple Silicon core configuration
  let performanceCores: number | undefined;
  let efficiencyCores: number | undefined;

  if (model.includes('Apple M')) {
    // Apple Silicon has P-cores and E-cores
    // M4 Max: 16 cores (12P + 4E)
    if (model.includes('M4 Max')) {
      performanceCores = 12;
      efficiencyCores = 4;
    } else if (model.includes('M4 Pro')) {
      performanceCores = 10;
      efficiencyCores = 4;
    } else if (model.includes('M4')) {
      performanceCores = 4;
      efficiencyCores = 6;
    } else if (model.includes('M3 Max')) {
      performanceCores = 12;
      efficiencyCores = 4;
    } else if (model.includes('M3 Pro')) {
      performanceCores = 6;
      efficiencyCores = 6;
    } else if (model.includes('M3')) {
      performanceCores = 4;
      efficiencyCores = 4;
    } else if (model.includes('M2 Ultra')) {
      performanceCores = 16;
      efficiencyCores = 8;
    } else if (model.includes('M2 Max')) {
      performanceCores = 8;
      efficiencyCores = 4;
    } else if (model.includes('M2 Pro')) {
      performanceCores = 8;
      efficiencyCores = 4;
    } else if (model.includes('M2')) {
      performanceCores = 4;
      efficiencyCores = 4;
    } else if (model.includes('M1 Ultra')) {
      performanceCores = 16;
      efficiencyCores = 4;
    } else if (model.includes('M1 Max')) {
      performanceCores = 8;
      efficiencyCores = 2;
    } else if (model.includes('M1 Pro')) {
      performanceCores = 8;
      efficiencyCores = 2;
    } else if (model.includes('M1')) {
      performanceCores = 4;
      efficiencyCores = 4;
    } else {
      // Generic Apple Silicon estimate
      performanceCores = Math.ceil(cores * 0.75);
      efficiencyCores = cores - performanceCores;
    }
  }

  const result: CPUInfo = { model, cores };
  if (performanceCores !== undefined) result.performanceCores = performanceCores;
  if (efficiencyCores !== undefined) result.efficiencyCores = efficiencyCores;
  if (speed !== undefined) result.speed = speed;
  return result;
}

/**
 * Detect memory information
 */
function detectMemory(): MemoryInfo {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();

  const total = Math.round(totalBytes / (1024 * 1024 * 1024));
  const available = Math.round(freeBytes / (1024 * 1024 * 1024));

  // Apple Silicon uses unified memory
  const cpus = os.cpus();
  const unified = cpus[0]?.model.includes('Apple M') || false;

  return {
    total,
    available,
    unified,
  };
}

/**
 * Detect GPU/Accelerator
 */
async function detectGPU(): Promise<GPUInfo | null> {
  const platform = os.platform();
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || '';

  // Check for Apple Silicon
  if (cpuModel.includes('Apple M')) {
    // Find matching Apple Silicon specs
    for (const [model, specs] of Object.entries(APPLE_SILICON_SPECS)) {
      if (cpuModel.includes(model.replace('Apple ', ''))) {
        const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
        const gpuInfo: GPUInfo = {
          type: model,
          memory: totalMemory,
          api: specs.api || 'Metal 3',
          computeCapability: 'metal-3',
        };
        if (specs.fp32Tflops !== undefined) gpuInfo.fp32Tflops = specs.fp32Tflops;
        if (specs.fp16Tflops !== undefined) gpuInfo.fp16Tflops = specs.fp16Tflops;
        if (specs.neuralEngine !== undefined) gpuInfo.neuralEngine = specs.neuralEngine;
        if (specs.neuralEngineTops !== undefined) gpuInfo.neuralEngineTops = specs.neuralEngineTops;
        return gpuInfo;
      }
    }

    // Generic Apple Silicon
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    return {
      type: cpuModel,
      memory: totalMemory,
      api: 'Metal 3',
      computeCapability: 'metal-3',
    };
  }

  // Check for NVIDIA GPU on Linux/Windows
  if (platform === 'linux' || platform === 'win32') {
    try {
      const result = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lines = result.trim().split('\n');
      const firstLine = lines[0];
      if (firstLine) {
        const parts = firstLine.split(',').map((s) => s.trim());
        const name = parts[0] ?? 'Unknown GPU';
        const memoryStr = parts[1] ?? '0';
        const memory = parseInt(memoryStr) / 1024; // Convert MiB to GB

        const gpuInfo: GPUInfo = {
          type: name,
          memory: Math.round(memory),
          api: 'CUDA',
        };
        const computeCap = await detectCudaCapability();
        if (computeCap !== undefined) gpuInfo.computeCapability = computeCap;
        return gpuInfo;
      }
    } catch {
      // nvidia-smi not available or no GPU
    }
  }

  return null;
}

/**
 * Detect CUDA compute capability
 */
async function detectCudaCapability(): Promise<string | undefined> {
  try {
    const result = execSync(
      'nvidia-smi --query-gpu=compute_cap --format=csv,noheader',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.trim();
  } catch {
    return undefined;
  }
}

/**
 * Detect installed ML frameworks
 */
async function detectFrameworks(): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = [];
  const cpus = os.cpus();
  const isAppleSilicon = cpus[0]?.model.includes('Apple M');

  // Check PyTorch
  try {
    const result = execSync('python3 -c "import torch; print(torch.__version__)"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const version = result.trim();

    // Check for GPU support
    let gpuSupport = false;
    try {
      if (isAppleSilicon) {
        const mpsCheck = execSync('python3 -c "import torch; print(torch.backends.mps.is_available())"', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        gpuSupport = mpsCheck.trim() === 'True';
      } else {
        const cudaCheck = execSync('python3 -c "import torch; print(torch.cuda.is_available())"', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        gpuSupport = cudaCheck.trim() === 'True';
      }
    } catch {
      // GPU check failed
    }

    frameworks.push({
      name: 'PyTorch',
      version,
      available: true,
      gpuSupport,
    });
  } catch {
    frameworks.push({
      name: 'PyTorch',
      available: false,
      gpuSupport: false,
    });
  }

  // Check TensorFlow
  try {
    const result = execSync('python3 -c "import tensorflow as tf; print(tf.__version__)"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const version = result.trim();

    // Check for GPU support
    let gpuSupport = false;
    try {
      const gpuCheck = execSync('python3 -c "import tensorflow as tf; print(len(tf.config.list_physical_devices(\'GPU\')) > 0)"', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      gpuSupport = gpuCheck.trim() === 'True';
    } catch {
      // GPU check failed
    }

    frameworks.push({
      name: 'TensorFlow',
      version,
      available: true,
      gpuSupport,
    });
  } catch {
    frameworks.push({
      name: 'TensorFlow',
      available: false,
      gpuSupport: false,
    });
  }

  // Check MLX (Apple Silicon only)
  if (isAppleSilicon) {
    try {
      const result = execSync('python3 -c "import mlx; print(mlx.__version__)"', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const version = result.trim();

      frameworks.push({
        name: 'MLX',
        version,
        available: true,
        gpuSupport: true, // MLX always uses GPU on Apple Silicon
      });
    } catch {
      frameworks.push({
        name: 'MLX',
        available: false,
        gpuSupport: false,
      });
    }
  }

  // Check JAX
  try {
    const result = execSync('python3 -c "import jax; print(jax.__version__)"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const version = result.trim();

    // Check for GPU support
    let gpuSupport = false;
    try {
      const gpuCheck = execSync('python3 -c "import jax; print(len(jax.devices(\'gpu\')) > 0)"', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      gpuSupport = gpuCheck.trim() === 'True';
    } catch {
      // GPU check failed
    }

    frameworks.push({
      name: 'JAX',
      version,
      available: true,
      gpuSupport,
    });
  } catch {
    frameworks.push({
      name: 'JAX',
      available: false,
      gpuSupport: false,
    });
  }

  return frameworks;
}

/**
 * Real-time system metrics
 */
export interface SystemMetrics {
  cpuPercent: number;
  memoryPercent: number;
  gpuPercent?: number;
  gpuMemoryPercent?: number;
  temperature?: number;
  thermalState?: string;  // Nominal, Fair, Serious, Critical

  // Extended metrics from powermetrics daemon
  power?: {
    cpu?: number;      // CPU power in mW
    gpu?: number;      // GPU power in mW
    ane?: number;      // Apple Neural Engine power in mW
    combined?: number; // Total power in mW
  };
  gpuFrequencyMHz?: number;  // Current GPU frequency
  cpuClusters?: {
    eClusterFreqMHz?: number;   // Efficiency cluster frequency
    eClusterActive?: number;    // E-cluster utilization %
    pClusterFreqMHz?: number;   // Performance cluster frequency
    pClusterActive?: number;    // P-cluster utilization %
  };
  battery?: {
    percentCharge?: number;     // 0-100
  };
}

/**
 * Collect real-time system metrics
 * Returns CPU utilization, memory usage, and GPU metrics where available
 */
export async function collectSystemMetrics(): Promise<SystemMetrics> {
  const cpuPercent = await getCpuUtilization();
  const memoryPercent = getMemoryUtilization();

  // Get GPU metrics for Apple Silicon or NVIDIA
  const gpuMetrics = await getGpuMetrics();

  const metrics: SystemMetrics = {
    cpuPercent,
    memoryPercent,
  };

  if (gpuMetrics.gpuPercent !== undefined) {
    metrics.gpuPercent = gpuMetrics.gpuPercent;
  }
  if (gpuMetrics.gpuMemoryPercent !== undefined) {
    metrics.gpuMemoryPercent = gpuMetrics.gpuMemoryPercent;
  }
  if (gpuMetrics.temperature !== undefined) {
    metrics.temperature = gpuMetrics.temperature;
  }

  // Get extended metrics from daemon (if available)
  const daemonData = readTemperatureFromDaemon();
  if (daemonData) {
    // Thermal state
    if (daemonData.thermalState) {
      metrics.thermalState = daemonData.thermalState;
    }

    // Power consumption
    if (daemonData.power) {
      metrics.power = daemonData.power;
    }

    // GPU frequency
    if (daemonData.gpuMetrics?.activeFrequencyMHz) {
      metrics.gpuFrequencyMHz = daemonData.gpuMetrics.activeFrequencyMHz;
    }

    // CPU cluster metrics
    if (daemonData.cpuMetrics) {
      const clusters: SystemMetrics['cpuClusters'] = {};
      if (daemonData.cpuMetrics.eClusterFreqMHz !== undefined) {
        clusters.eClusterFreqMHz = daemonData.cpuMetrics.eClusterFreqMHz;
      }
      if (daemonData.cpuMetrics.eClusterActive !== undefined) {
        clusters.eClusterActive = daemonData.cpuMetrics.eClusterActive;
      }
      if (daemonData.cpuMetrics.pClusterFreqMHz !== undefined) {
        clusters.pClusterFreqMHz = daemonData.cpuMetrics.pClusterFreqMHz;
      }
      if (daemonData.cpuMetrics.pClusterActive !== undefined) {
        clusters.pClusterActive = daemonData.cpuMetrics.pClusterActive;
      }
      if (Object.keys(clusters).length > 0) {
        metrics.cpuClusters = clusters;
      }
    }

    // Battery
    if (daemonData.battery) {
      metrics.battery = daemonData.battery;
    }
  }

  return metrics;
}

/**
 * Get CPU utilization percentage
 * Uses a 1-second sample to calculate accurate usage
 */
async function getCpuUtilization(): Promise<number> {
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS: Use top command for quick CPU sample
    try {
      const result = execSync(
        'top -l 1 -n 0 | grep "CPU usage"',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 5000 }
      );
      // Parse: "CPU usage: 5.55% user, 8.33% sys, 86.11% idle"
      const match = result.match(/(\d+\.?\d*)% user.*?(\d+\.?\d*)% sys.*?(\d+\.?\d*)% idle/);
      if (match && match[1] && match[2]) {
        const user = parseFloat(match[1]);
        const sys = parseFloat(match[2]);
        return Math.round((user + sys) * 10) / 10;
      }
    } catch {
      // Fallback to load average based estimate
      const loadAvg = os.loadavg()[0] ?? 0;
      const cpuCount = os.cpus().length;
      return Math.min(100, Math.round((loadAvg / cpuCount) * 100 * 10) / 10);
    }
  } else if (platform === 'linux') {
    // Linux: Read from /proc/stat
    try {
      const stat1 = execSync('cat /proc/stat | head -1', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief sample
      const stat2 = execSync('cat /proc/stat | head -1', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

      const parse = (line: string) => {
        const parts = line.split(/\s+/).slice(1).map(Number);
        const idle = (parts[3] ?? 0) + (parts[4] ?? 0);
        const total = parts.reduce((a, b) => a + b, 0);
        return { idle, total };
      };

      const s1 = parse(stat1);
      const s2 = parse(stat2);

      const idleDiff = s2.idle - s1.idle;
      const totalDiff = s2.total - s1.total;

      if (totalDiff > 0) {
        return Math.round((1 - idleDiff / totalDiff) * 1000) / 10;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: Use load average
  const loadAvg = os.loadavg()[0] ?? 0;
  const cpuCount = os.cpus().length;
  return Math.min(100, Math.round((loadAvg / cpuCount) * 100 * 10) / 10);
}

/**
 * Get memory utilization percentage
 */
function getMemoryUtilization(): number {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 1000) / 10;
}

/**
 * Get GPU metrics (Apple Silicon or NVIDIA)
 */
async function getGpuMetrics(): Promise<{ gpuPercent?: number; gpuMemoryPercent?: number; temperature?: number }> {
  const platform = os.platform();
  const cpus = os.cpus();
  const isAppleSilicon = cpus[0]?.model.includes('Apple M');

  if (isAppleSilicon && platform === 'darwin') {
    return getAppleSiliconGpuMetrics();
  } else if (platform === 'linux' || platform === 'win32') {
    return getNvidiaGpuMetrics();
  }

  return {};
}

/**
 * Get Apple Silicon GPU metrics using ioreg and temperature daemon
 */
async function getAppleSiliconGpuMetrics(): Promise<{ gpuPercent?: number; gpuMemoryPercent?: number; temperature?: number }> {
  const result: { gpuPercent?: number; gpuMemoryPercent?: number; temperature?: number } = {};

  try {
    // Use ioreg to get GPU utilization from PerformanceStatistics
    // This works without root access on macOS
    // Use grep -o to extract just the key=value pairs
    const gpuUtil = execSync(
      'ioreg -r -d 1 -c IOAccelerator 2>/dev/null | grep -o \'"Device Utilization %"=[0-9]*\'',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 }
    );

    // Parse: "Device Utilization %"=15
    const utilMatch = gpuUtil.match(/"Device Utilization %"=(\d+)/);
    if (utilMatch && utilMatch[1]) {
      result.gpuPercent = parseInt(utilMatch[1], 10);
    }
  } catch {
    // GPU utilization not available
  }

  try {
    // Get GPU memory usage
    const gpuMem = execSync(
      'ioreg -r -d 1 -c IOAccelerator 2>/dev/null | grep -o \'"In use system memory"=[0-9]*\'',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 }
    );

    // Parse: "In use system memory"=1350582272 (bytes)
    const memMatch = gpuMem.match(/"In use system memory"=(\d+)/);
    if (memMatch && memMatch[1]) {
      const usedBytes = parseInt(memMatch[1], 10);
      const totalMem = os.totalmem();
      result.gpuMemoryPercent = Math.round((usedBytes / totalMem) * 1000) / 10;
    }
  } catch {
    // ioreg approach failed, try vm_stat as fallback for memory
    try {
      const vmStat = execSync('vm_stat', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pageSize = 16384; // Apple Silicon page size

      const activeMatch = vmStat.match(/Pages active:\s+(\d+)/);
      const wiredMatch = vmStat.match(/Pages wired down:\s+(\d+)/);
      const totalMem = os.totalmem();

      if (activeMatch && activeMatch[1] && wiredMatch && wiredMatch[1]) {
        const activeBytes = parseInt(activeMatch[1], 10) * pageSize;
        const wiredBytes = parseInt(wiredMatch[1], 10) * pageSize;
        const usedBytes = activeBytes + wiredBytes;
        result.gpuMemoryPercent = Math.round((usedBytes / totalMem) * 1000) / 10;
      }
    } catch {
      // Can't get GPU metrics
    }
  }

  // Try to get metrics from the daemon first (requires one-time sudo install)
  // The daemon uses powermetrics which gives accurate readings on Apple Silicon
  const daemonData = readTemperatureFromDaemon();
  if (daemonData) {
    // Use GPU active residency from daemon (much more accurate than ioreg)
    if (daemonData.gpuMetrics?.activeResidency !== undefined) {
      result.gpuPercent = Math.round(daemonData.gpuMetrics.activeResidency * 10) / 10;
    }

    // Get temperature
    const temp = daemonData.cpu ?? daemonData.soc ?? daemonData.gpu;
    if (temp !== undefined && temp > 20 && temp < 110) {
      result.temperature = temp;
    }

    // If we got GPU data from daemon, return early (it's more accurate)
    if (result.gpuPercent !== undefined) {
      return result;
    }
  }

  // Fallback: Try osx-cpu-temp (if installed via brew)
  // Note: osx-cpu-temp returns 0.0°C on Apple Silicon M4, so we need to validate
  try {
    const tempOutput = execSync('osx-cpu-temp 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 2000
    });
    // Output format: "65.0°C" or "65.0 C"
    const tempMatch = tempOutput.match(/(\d+\.?\d*)\s*[°]?C/);
    if (tempMatch && tempMatch[1]) {
      const temp = parseFloat(tempMatch[1]);
      // Only use temperature if it's reasonable (> 20°C, < 110°C)
      // osx-cpu-temp returns 0°C on Apple Silicon which is invalid
      if (temp > 20 && temp < 110) {
        result.temperature = temp;
      }
    }
  } catch {
    // osx-cpu-temp not installed or failed
  }

  return result;
}

/**
 * Get NVIDIA GPU metrics using nvidia-smi
 */
async function getNvidiaGpuMetrics(): Promise<{ gpuPercent?: number; gpuMemoryPercent?: number; temperature?: number }> {
  const result: { gpuPercent?: number; gpuMemoryPercent?: number; temperature?: number } = {};

  try {
    const output = execSync(
      'nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 5000 }
    );

    const parts = output.trim().split(',').map(s => s.trim());
    if (parts.length >= 5 && parts[0] && parts[2] && parts[3] && parts[4]) {
      result.gpuPercent = parseInt(parts[0], 10);
      const memUsed = parseInt(parts[2], 10);
      const memTotal = parseInt(parts[3], 10);
      if (memTotal > 0) {
        result.gpuMemoryPercent = Math.round((memUsed / memTotal) * 1000) / 10;
      }
      result.temperature = parseInt(parts[4], 10);
    }
  } catch {
    // nvidia-smi not available or no GPU
  }

  return result;
}

export default detectHardware;
