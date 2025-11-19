/**
 * List Services Command
 *
 * Lists all discovered services with their status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { execSync } from 'child_process';

interface ServiceInfo {
  name: string;
  container: string;
  status: string;
  ports: string;
}

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all Nexus services')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const spinner = ora('Discovering services...').start();

        const services = await discoverServices();

        spinner.succeed(`Found ${services.length} services`);

        if (options.json) {
          console.log(JSON.stringify(services, null, 2));
          return;
        }

        if (services.length === 0) {
          console.log(chalk.yellow('\nNo services discovered.'));
          console.log(chalk.dim('Make sure Docker containers are running.\n'));
          return;
        }

        const table = new Table({
          head: [
            chalk.bold('Service'),
            chalk.bold('Container'),
            chalk.bold('Status'),
            chalk.bold('Ports'),
          ],
          colWidths: [20, 25, 15, 30],
        });

        for (const service of services) {
          table.push([
            chalk.cyan(service.name),
            service.container,
            getStatusDisplay(service.status),
            service.ports || '-',
          ]);
        }

        console.log('\n' + table.toString() + '\n');
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function discoverServices(): Promise<ServiceInfo[]> {
  try {
    const output = execSync(
      'docker ps -a --filter "name=nexus-" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    if (!output.trim()) {
      return [];
    }

    const lines = output.trim().split('\n');
    return lines.map((line) => {
      const [container, status, ports] = line.split('\t');
      const name = (container || '').replace('nexus-', '').replace(/-\d+$/, '');

      return {
        name,
        container: container || '',
        status: status || '',
        ports: ports || '-',
      };
    });
  } catch (error) {
    return [];
  }
}

function getStatusDisplay(status: string): string {
  if (status.toLowerCase().includes('up')) {
    return chalk.green('Running');
  } else if (status.toLowerCase().includes('exited')) {
    return chalk.red('Stopped');
  } else if (status.toLowerCase().includes('paused')) {
    return chalk.yellow('Paused');
  } else {
    return chalk.gray(status);
  }
}
