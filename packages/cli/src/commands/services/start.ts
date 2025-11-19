/**
 * Service Start Command
 *
 * Start service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  startContainer,
  executeDockerCommand,
  DockerExecutionError,
  DockerErrorType,
} from '../../core/docker/docker-executor.js';

export function createStartCommand(): Command {
  const command = new Command('start');

  command
    .description('Start service(s)')
    .argument('[service]', 'Service name (optional, starts all if omitted)')
    .action(async (serviceName) => {
      try {
        if (serviceName) {
          await startSingleService(serviceName);
        } else {
          await startAllServices();
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function startSingleService(serviceName: string): Promise<void> {
  const spinner = ora(`Starting ${serviceName}...`).start();

  try {
    const containerName = `nexus-${serviceName}`;

    await startContainer(containerName);

    spinner.succeed(chalk.green(`Started ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`Check status: nexus services status ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to start ${serviceName}`));

    if (error instanceof DockerExecutionError) {
      if (error.type === DockerErrorType.NOT_FOUND) {
        console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
        console.error(chalk.dim('Run "nexus services list" to see available services\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.PERMISSION_DENIED) {
        console.error(chalk.red('\nPermission denied accessing Docker.'));
        console.error(chalk.dim('Try running with sudo or check Docker permissions\n'));
      } else {
        console.error(chalk.red(`\n${error.message}\n`));
      }
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}

async function startAllServices(): Promise<void> {
  const spinner = ora('Starting all Nexus services...').start();

  try {
    await executeDockerCommand(
      'compose -f docker/docker-compose.nexus.yml up -d',
      { timeout: 60000 } // 60s timeout for docker-compose
    );

    spinner.succeed(chalk.green('Started all Nexus services'));

    console.log(chalk.dim('\nRun "nexus services status" to check service health\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to start services'));

    if (error instanceof DockerExecutionError) {
      if (error.stderr?.includes('docker-compose.nexus.yml') ||
          error.stderr?.includes('no such file')) {
        console.error(chalk.yellow('\nDocker Compose file not found.'));
        console.error(chalk.dim('Make sure you are in the Nexus project root directory\n'));
      } else if (error.type === DockerErrorType.NOT_RUNNING) {
        console.error(chalk.red('\nDocker daemon is not running.'));
        console.error(chalk.dim('Please start Docker and try again\n'));
      } else if (error.type === DockerErrorType.TIMEOUT) {
        console.error(chalk.red('\nDocker compose operation timed out.'));
        console.error(chalk.dim('Services may still be starting. Check with "nexus services status"\n'));
      } else {
        console.error(chalk.red(`\n${error.message}\n`));
      }
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}
