/**
 * Service Stop Command
 *
 * Stop service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  stopContainer,
  executeDockerCommand,
  DockerExecutionError,
  DockerErrorType,
} from '../../core/docker/docker-executor.js';

export function createStopCommand(): Command {
  const command = new Command('stop');

  command
    .description('Stop service(s)')
    .argument('[service]', 'Service name (optional, stops all if omitted)')
    .option('-t, --timeout <seconds>', 'Timeout before killing (default: 10)', '10')
    .action(async (serviceName, options) => {
      try {
        const timeout = parseInt(options.timeout, 10);

        if (serviceName) {
          await stopSingleService(serviceName, timeout);
        } else {
          await stopAllServices();
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function stopSingleService(serviceName: string, timeout: number = 10): Promise<void> {
  const spinner = ora(`Stopping ${serviceName}...`).start();

  try {
    const containerName = `nexus-${serviceName}`;

    await stopContainer(containerName, timeout);

    spinner.succeed(chalk.green(`Stopped ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`To restart: nexus services start ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to stop ${serviceName}`));

    if (error instanceof DockerExecutionError) {
      if (error.type === DockerErrorType.NOT_FOUND) {
        console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
        console.error(chalk.dim('Run "nexus services list" to see available services\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.TIMEOUT) {
        console.error(chalk.red(`\nContainer did not stop within ${timeout} seconds.'));
        console.error(chalk.dim('Try increasing the timeout with --timeout flag\n'));
      } else {
        console.error(chalk.red(`\n${error.message}\n`));
      }
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}

async function stopAllServices(): Promise<void> {
  const spinner = ora('Stopping all Nexus services...').start();

  try {
    await executeDockerCommand(
      'compose -f docker/docker-compose.nexus.yml stop',
      { timeout: 60000 } // 60s timeout
    );

    spinner.succeed(chalk.green('Stopped all Nexus services'));

    console.log(chalk.yellow('\n⚠️  Services stopped but containers preserved'));
    console.log(chalk.dim('To restart: nexus services start'));
    console.log(chalk.dim('To remove: docker-compose down (not recommended)\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to stop services'));

    if (error instanceof DockerExecutionError) {
      if (error.stderr?.includes('docker-compose.nexus.yml') ||
          error.stderr?.includes('no such file')) {
        console.error(chalk.yellow('\nDocker Compose file not found.'));
        console.error(chalk.dim('Make sure you are in the Nexus project root directory\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.TIMEOUT) {
        console.error(chalk.red('\nDocker compose stop operation timed out.'));
        console.error(chalk.dim('Some services may still be running\n'));
      } else {
        console.error(chalk.red(`\n${error.message}\n`));
      }
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}
