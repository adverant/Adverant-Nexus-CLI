/**
 * Service Restart Command
 *
 * Restart service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  restartContainer,
  executeDockerCommand,
  DockerExecutionError,
  DockerErrorType,
} from '../../core/docker/docker-executor.js';

export function createRestartCommand(): Command {
  const command = new Command('restart');

  command
    .description('Restart service(s)')
    .argument('[service]', 'Service name (optional, restarts all if omitted)')
    .option('-t, --timeout <seconds>', 'Timeout before killing (default: 10)', '10')
    .action(async (serviceName, options) => {
      try {
        const timeout = parseInt(options.timeout, 10);

        if (serviceName) {
          await restartSingleService(serviceName, timeout);
        } else {
          await restartAllServices();
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function restartSingleService(serviceName: string, timeout: number = 10): Promise<void> {
  const spinner = ora(`Restarting ${serviceName}...`).start();

  try {
    const containerName = `nexus-${serviceName}`;

    await restartContainer(containerName, timeout);

    spinner.succeed(chalk.green(`Restarted ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`Check status: nexus services status ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to restart ${serviceName}`));

    if (error instanceof DockerExecutionError) {
      if (error.type === DockerErrorType.NOT_FOUND) {
        console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
        console.error(chalk.dim('Run "nexus services list" to see available services\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.TIMEOUT) {
        console.error(chalk.red(`\nContainer did not restart within ${timeout} seconds.'));
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

async function restartAllServices(): Promise<void> {
  const spinner = ora('Restarting all Nexus services...').start();

  try {
    await executeDockerCommand(
      'compose -f docker/docker-compose.nexus.yml restart',
      { timeout: 60000 } // 60s timeout
    );

    spinner.succeed(chalk.green('Restarted all Nexus services'));

    console.log(chalk.dim('\nRun "nexus services status" to check service health\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to restart services'));

    if (error instanceof DockerExecutionError) {
      if (error.stderr?.includes('docker-compose.nexus.yml') ||
          error.stderr?.includes('no such file')) {
        console.error(chalk.yellow('\nDocker Compose file not found.'));
        console.error(chalk.dim('Make sure you are in the Nexus project root directory\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.TIMEOUT) {
        console.error(chalk.red('\nDocker compose restart operation timed out.'));
        console.error(chalk.dim('Services may still be restarting. Check with "nexus services status"\n'));
      } else {
        console.error(chalk.red(`\n${error.message}\n`));
      }
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}
