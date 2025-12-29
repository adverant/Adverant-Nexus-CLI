/**
 * Compute Resources Command
 *
 * Display local hardware capabilities for ML workloads.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { detectHardware, type HardwareInfo } from './lib/hardware-detection.js';

export function createComputeResourcesCommand(): Command {
  return new Command('resources')
    .description('Show local compute resources')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      const spinner = ora('Detecting hardware...').start();

      try {
        const hardware = await detectHardware();
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(hardware, null, 2));
          return;
        }

        displayResources(hardware);
      } catch (error) {
        spinner.fail('Failed to detect hardware');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });
}

function displayResources(hardware: HardwareInfo): void {
  console.log();
  console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║           LOCAL COMPUTE RESOURCES                          ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  console.log();

  // System Info
  console.log(chalk.white.bold('System Information'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Platform:    ${chalk.cyan(hardware.platform)}`);
  console.log(`  Arch:        ${chalk.cyan(hardware.arch)}`);
  console.log(`  Hostname:    ${chalk.cyan(hardware.hostname)}`);
  console.log();

  // CPU
  console.log(chalk.white.bold('CPU'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Model:       ${chalk.cyan(hardware.cpu.model)}`);
  console.log(`  Total Cores: ${chalk.cyan(hardware.cpu.cores.toString())}`);
  if (hardware.cpu.performanceCores !== undefined) {
    console.log(`  P-Cores:     ${chalk.green(hardware.cpu.performanceCores.toString())} (Performance)`);
    console.log(`  E-Cores:     ${chalk.yellow(hardware.cpu.efficiencyCores?.toString() || '0')} (Efficiency)`);
  }
  if (hardware.cpu.speed) {
    console.log(`  Base Speed:  ${chalk.cyan(`${hardware.cpu.speed} MHz`)}`);
  }
  console.log();

  // Memory
  console.log(chalk.white.bold('Memory'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Total:       ${chalk.cyan(`${hardware.memory.total} GB`)}`);
  console.log(`  Available:   ${chalk.green(`${hardware.memory.available} GB`)}`);
  console.log(`  Type:        ${chalk.cyan(hardware.memory.unified ? 'Unified Memory' : 'Discrete')}`);
  console.log();

  // GPU/Accelerator
  console.log(chalk.white.bold('GPU / Accelerator'));
  console.log(chalk.gray('─'.repeat(60)));

  if (hardware.gpu) {
    console.log(`  Type:        ${chalk.cyan(hardware.gpu.type)}`);
    console.log(`  Memory:      ${chalk.cyan(`${hardware.gpu.memory} GB`)}${hardware.memory.unified ? chalk.dim(' (unified)') : ''}`);
    console.log(`  API:         ${chalk.cyan(hardware.gpu.api)}`);

    if (hardware.gpu.fp32Tflops) {
      console.log(`  FP32:        ${chalk.green(`${hardware.gpu.fp32Tflops} TFLOPS`)}`);
    }
    if (hardware.gpu.fp16Tflops) {
      console.log(`  FP16:        ${chalk.green(`${hardware.gpu.fp16Tflops} TFLOPS`)}`);
    }
    if (hardware.gpu.computeCapability) {
      console.log(`  Compute:     ${chalk.cyan(hardware.gpu.computeCapability)}`);
    }
    if (hardware.gpu.neuralEngine) {
      console.log(`  Neural Eng:  ${chalk.magenta(`${hardware.gpu.neuralEngineTops} TOPS`)}`);
    }
  } else {
    console.log(chalk.yellow('  No GPU detected'));
  }
  console.log();

  // ML Frameworks
  console.log(chalk.white.bold('ML Frameworks'));
  console.log(chalk.gray('─'.repeat(60)));

  const frameworkTable = new Table({
    head: [
      chalk.white('Framework'),
      chalk.white('Version'),
      chalk.white('Status'),
      chalk.white('GPU Support'),
    ],
    colWidths: [15, 15, 12, 15],
    style: { head: [], border: [] },
  });

  hardware.frameworks.forEach((fw) => {
    frameworkTable.push([
      fw.name,
      fw.version || '-',
      fw.available ? chalk.green('Available') : chalk.red('Not Found'),
      fw.gpuSupport ? chalk.green('Yes') : chalk.gray('No'),
    ]);
  });

  console.log(frameworkTable.toString());
  console.log();

  // Recommendations
  console.log(chalk.white.bold('Recommendations'));
  console.log(chalk.gray('─'.repeat(60)));

  const recommendations: string[] = [];

  if (hardware.gpu?.type.includes('Apple')) {
    if (hardware.frameworks.find((f) => f.name === 'MLX' && f.available)) {
      recommendations.push(chalk.green('✓') + ' MLX available - optimal for Apple Silicon');
    } else {
      recommendations.push(chalk.yellow('!') + ' Consider installing MLX for best Apple Silicon performance');
    }

    if (hardware.frameworks.find((f) => f.name === 'PyTorch' && f.gpuSupport)) {
      recommendations.push(chalk.green('✓') + ' PyTorch MPS backend available');
    }
  }

  if (hardware.gpu?.type.includes('NVIDIA')) {
    if (hardware.frameworks.find((f) => f.name === 'PyTorch' && f.gpuSupport)) {
      recommendations.push(chalk.green('✓') + ' PyTorch CUDA available');
    }
  }

  if (!hardware.gpu) {
    recommendations.push(chalk.yellow('!') + ' No GPU detected - ML jobs will run on CPU only');
  }

  if (recommendations.length === 0) {
    recommendations.push(chalk.gray('No specific recommendations'));
  }

  recommendations.forEach((rec) => console.log(`  ${rec}`));
  console.log();
}

export default createComputeResourcesCommand;
