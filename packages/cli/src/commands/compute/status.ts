/**
 * Compute Status Command
 *
 * Check status of local compute agent and jobs.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LocalComputeClient } from './lib/local-compute-client.js';
import type { LocalComputeJob, ComputeAgentStatus } from '@adverant-nexus/types';

export function createComputeStatusCommand(): Command {
  return new Command('status')
    .description('Check status of local compute agent and jobs')
    .argument('[jobId]', 'Specific job ID to check')
    .option('-p, --port <port>', 'Agent port', '9200')
    .option('--json', 'Output as JSON')
    .action(async (jobId: string | undefined, options: { port: string; json?: boolean }) => {
      const client = new LocalComputeClient({
        port: parseInt(options.port, 10),
      });

      try {
        // Check if agent is running
        const spinner = ora('Checking agent status...').start();

        const isRunning = await client.checkHealth();

        if (!isRunning) {
          spinner.fail('Agent is not running');
          console.log(chalk.gray('\nStart the agent with: nexus compute agent start'));
          process.exit(1);
        }

        spinner.succeed('Agent is running');

        if (jobId) {
          // Get specific job status
          const job = await client.getJob(jobId);

          if (!job) {
            console.log(chalk.red(`\nJob ${jobId} not found`));
            process.exit(1);
          }

          if (options.json) {
            console.log(JSON.stringify(job, null, 2));
          } else {
            displayJobDetails(job);
          }
        } else {
          // Get agent status
          const status = await client.getStatus();

          if (options.json) {
            console.log(JSON.stringify(status, null, 2));
          } else {
            displayAgentStatus(status);
          }
        }
      } catch (error) {
        console.error(chalk.red('Failed to get status:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function displayAgentStatus(status: ComputeAgentStatus): void {
  console.log();
  console.log(chalk.cyan.bold('Agent Status'));
  console.log(chalk.gray('─'.repeat(50)));

  const statusColor = status.status === 'idle' ? chalk.green :
                      status.status === 'busy' ? chalk.yellow :
                      status.status === 'error' ? chalk.red : chalk.gray;

  console.log(`  ID:              ${chalk.cyan(status.id)}`);
  console.log(`  Name:            ${chalk.white(status.name)}`);
  console.log(`  Status:          ${statusColor(status.status)}`);
  console.log(`  Registered:      ${chalk.gray(new Date(status.registeredAt).toLocaleString())}`);
  console.log(`  Last Heartbeat:  ${chalk.gray(new Date(status.lastHeartbeat).toLocaleString())}`);
  console.log();

  // Hardware summary
  if (status.hardware) {
    console.log(chalk.white.bold('Hardware'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  CPU:             ${chalk.cyan(status.hardware.cpu.model)}`);
    console.log(`  Cores:           ${chalk.cyan(status.hardware.cpu.cores.toString())}`);
    console.log(`  Memory:          ${chalk.cyan(`${status.hardware.memory.total} GB`)}`);
    if (status.hardware.gpu) {
      console.log(`  GPU:             ${chalk.cyan(status.hardware.gpu.type)}`);
    }
    console.log();
  }

  // Stats
  console.log(chalk.white.bold('Statistics'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Jobs Completed:  ${chalk.green(status.jobsCompleted.toString())}`);
  console.log(`  Jobs Failed:     ${chalk.red(status.jobsFailed.toString())}`);

  const hours = Math.floor(status.totalComputeTime / 3600);
  const minutes = Math.floor((status.totalComputeTime % 3600) / 60);
  console.log(`  Total Compute:   ${chalk.cyan(`${hours}h ${minutes}m`)}`);
  console.log();

  // Current job
  if (status.currentJob) {
    console.log(chalk.white.bold('Current Job'));
    console.log(chalk.gray('─'.repeat(50)));
    displayJobSummary(status.currentJob);
  }
}

function displayJobDetails(job: LocalComputeJob): void {
  console.log();
  console.log(chalk.cyan.bold(`Job: ${job.name}`));
  console.log(chalk.gray('─'.repeat(50)));

  const statusColor = getStatusColor(job.status);

  console.log(`  ID:              ${chalk.cyan(job.id)}`);
  console.log(`  Status:          ${statusColor(job.status)}`);
  console.log(`  Framework:       ${chalk.cyan(job.framework)}`);
  console.log(`  Working Dir:     ${chalk.gray(job.workingDir)}`);
  console.log();

  // Times
  console.log(chalk.white.bold('Timing'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Submitted:       ${chalk.gray(new Date(job.submittedAt).toLocaleString())}`);
  if (job.startedAt) {
    console.log(`  Started:         ${chalk.gray(new Date(job.startedAt).toLocaleString())}`);
  }
  if (job.completedAt) {
    console.log(`  Completed:       ${chalk.gray(new Date(job.completedAt).toLocaleString())}`);
  }
  console.log();

  // Resources
  console.log(chalk.white.bold('Resources'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  GPU:             ${job.resources.gpu ? chalk.green('Yes') : chalk.gray('No')}`);
  if (job.resources.cpuCores) {
    console.log(`  CPU Cores:       ${chalk.cyan(job.resources.cpuCores.toString())}`);
  }
  if (job.resources.memoryGb) {
    console.log(`  Memory:          ${chalk.cyan(`${job.resources.memoryGb} GB`)}`);
  }
  console.log();

  // Metrics (if completed)
  if (job.metrics) {
    console.log(chalk.white.bold('Metrics'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Duration:        ${chalk.cyan(`${job.metrics.durationSeconds.toFixed(1)}s`)}`);
    console.log(`  Peak Memory:     ${chalk.cyan(`${job.metrics.peakMemoryGb.toFixed(2)} GB`)}`);
    if (job.metrics.peakGpuMemoryGb) {
      console.log(`  Peak GPU Memory: ${chalk.cyan(`${job.metrics.peakGpuMemoryGb.toFixed(2)} GB`)}`);
    }
    console.log(`  CPU Utilization: ${chalk.cyan(`${job.metrics.cpuUtilization.toFixed(1)}%`)}`);
    if (job.metrics.gpuUtilization) {
      console.log(`  GPU Utilization: ${chalk.cyan(`${job.metrics.gpuUtilization.toFixed(1)}%`)}`);
    }
    console.log();
  }

  // Error
  if (job.error) {
    console.log(chalk.red.bold('Error'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.red(`  ${job.error}`));
    console.log();
  }

  // Recent logs
  if (job.logs && job.logs.length > 0) {
    console.log(chalk.white.bold('Recent Logs'));
    console.log(chalk.gray('─'.repeat(50)));
    const recentLogs = job.logs.slice(-10);
    recentLogs.forEach((line) => {
      console.log(chalk.gray(`  ${line.trim()}`));
    });
    if (job.logs.length > 10) {
      console.log(chalk.dim(`  ... and ${job.logs.length - 10} more lines`));
    }
    console.log();
  }
}

function displayJobSummary(job: LocalComputeJob): void {
  const statusColor = getStatusColor(job.status);

  console.log(`  Name:            ${chalk.white(job.name)}`);
  console.log(`  ID:              ${chalk.cyan(job.id)}`);
  console.log(`  Status:          ${statusColor(job.status)}`);
  console.log(`  Framework:       ${chalk.cyan(job.framework)}`);

  if (job.startedAt) {
    const duration = Date.now() - new Date(job.startedAt).getTime();
    const seconds = Math.floor(duration / 1000);
    console.log(`  Running for:     ${chalk.cyan(`${seconds}s`)}`);
  }
  console.log();
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'queued':
      return chalk.gray;
    case 'running':
      return chalk.yellow;
    case 'completed':
      return chalk.green;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.magenta;
    default:
      return chalk.white;
  }
}

export default createComputeStatusCommand;
