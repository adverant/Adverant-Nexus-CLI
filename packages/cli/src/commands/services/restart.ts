/**
 * Service Restart Command
 *
 * Restart service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

export function createRestartCommand(): Command {
  const command = new Command('restart');

  command
    .description('Restart service(s)')
    .argument('[service]', 'Service name (optional, restarts all if omitted)')
    .action(async (serviceName) => {
      try {
        if (serviceName) {
          await restartSingleService(serviceName);
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

async function restartSingleService(serviceName: string): Promise<void> {
  const spinner = ora(`Restarting ${serviceName}...`).start();

  try {
    const containerName = `nexus-${serviceName}`;

    execSync(`docker restart ${containerName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green(`Restarted ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`Check status: nexus services status ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to restart ${serviceName}`));

    if (error.message.includes('No such container')) {
      console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
      console.error(chalk.dim('Run "nexus services list" to see available services\n'));
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}

async function restartAllServices(): Promise<void> {
  const spinner = ora('Restarting all Nexus services...').start();

  try {
    execSync('docker-compose -f docker/docker-compose.nexus.yml restart', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green('Restarted all Nexus services'));

    console.log(chalk.dim('\nRun "nexus services status" to check service health\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to restart services'));

    if (error.message.includes('docker-compose.nexus.yml')) {
      console.error(
        chalk.yellow('\nDocker Compose file not found.')
      );
      console.error(
        chalk.dim('Make sure you are in the Nexus project root directory\n')
      );
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}
