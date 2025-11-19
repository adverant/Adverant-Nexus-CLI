/**
 * Service Logs Command
 *
 * View service logs via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';

export function createLogsCommand(): Command {
  const command = new Command('logs');

  command
    .description('View service logs')
    .argument('<service>', 'Service name')
    .option('-f, --follow', 'Follow log output', false)
    .option('-n, --lines <number>', 'Number of lines to show from the end', '100')
    .option('-t, --timestamps', 'Show timestamps', false)
    .action(async (serviceName, options) => {
      try {
        await streamLogs(serviceName, options);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function streamLogs(
  serviceName: string,
  options: {
    follow: boolean;
    lines: string;
    timestamps: boolean;
  }
): Promise<void> {
  const containerName = `nexus-${serviceName}`;

  const dockerArgs = ['logs'];

  if (options.follow) {
    dockerArgs.push('--follow');
  }

  if (options.lines) {
    dockerArgs.push('--tail', options.lines);
  }

  if (options.timestamps) {
    dockerArgs.push('--timestamps');
  }

  dockerArgs.push(containerName);

  console.log(chalk.cyan(`\n📄 Logs for ${serviceName}`));
  console.log(chalk.dim(`Container: ${containerName}\n`));

  const child = spawn('docker', dockerArgs, {
    stdio: 'inherit',
  });

  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`docker logs exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      if (error.message.includes('ENOENT')) {
        reject(new Error('Docker command not found. Please install Docker.'));
      } else {
        reject(error);
      }
    });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });
  });
}
