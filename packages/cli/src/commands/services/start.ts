/**
 * Service Start Command
 *
 * Start service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

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

    execSync(`docker start ${containerName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green(`Started ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`Check status: nexus services status ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to start ${serviceName}`));

    if (error.message.includes('No such container')) {
      console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
      console.error(chalk.dim('Run "nexus services list" to see available services\n'));
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}

async function startAllServices(): Promise<void> {
  const spinner = ora('Starting all Nexus services...').start();

  try {
    execSync('docker-compose -f docker/docker-compose.nexus.yml up -d', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green('Started all Nexus services'));

    console.log(chalk.dim('\nRun "nexus services status" to check service health\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to start services'));

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
