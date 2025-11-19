/**
 * Service Stop Command
 *
 * Stop service(s) via Docker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

export function createStopCommand(): Command {
  const command = new Command('stop');

  command
    .description('Stop service(s)')
    .argument('[service]', 'Service name (optional, stops all if omitted)')
    .action(async (serviceName) => {
      try {
        if (serviceName) {
          await stopSingleService(serviceName);
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

async function stopSingleService(serviceName: string): Promise<void> {
  const spinner = ora(`Stopping ${serviceName}...`).start();

  try {
    const containerName = `nexus-${serviceName}`;

    execSync(`docker stop ${containerName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green(`Stopped ${serviceName}`));

    console.log(chalk.dim(`\nContainer: ${containerName}`));
    console.log(chalk.dim(`To restart: nexus services start ${serviceName}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to stop ${serviceName}`));

    if (error.message.includes('No such container')) {
      console.error(chalk.yellow(`\nContainer not found: nexus-${serviceName}`));
      console.error(chalk.dim('Run "nexus services list" to see available services\n'));
    } else {
      console.error(chalk.red(`\n${error.message}\n`));
    }

    process.exit(1);
  }
}

async function stopAllServices(): Promise<void> {
  const spinner = ora('Stopping all Nexus services...').start();

  try {
    execSync('docker-compose -f docker/docker-compose.nexus.yml stop', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(chalk.green('Stopped all Nexus services'));

    console.log(chalk.yellow('\n⚠️  Services stopped but containers preserved'));
    console.log(chalk.dim('To restart: nexus services start'));
    console.log(chalk.dim('To remove: docker-compose down (not recommended)\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to stop services'));

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
