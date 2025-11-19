/**
 * Service Status Command
 *
 * Shows detailed status of a specific service or all services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { execSync } from 'child_process';

interface ContainerStatus {
  running: boolean;
  status: string;
  health: string;
  startedAt?: string;
  uptime?: string;
  pid?: number;
  exitCode?: number;
}

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Show service status')
    .argument('[service]', 'Service name (optional, shows all if omitted)')
    .option('--json', 'Output as JSON')
    .action(async (serviceName, options) => {
      try {
        if (serviceName) {
          const containerName = `nexus-${serviceName}`;
          const status = await getContainerStatus(containerName);

          if (options.json) {
            console.log(JSON.stringify({ service: serviceName, ...status }, null, 2));
            return;
          }

          displayServiceStatus(serviceName, status);
        } else {
          const services = await getAllServices();

          if (options.json) {
            console.log(JSON.stringify(services, null, 2));
            return;
          }

          displayAllStatus(services);
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function getContainerStatus(containerName: string): Promise<ContainerStatus> {
  try {
    const inspect = execSync(
      `docker inspect ${containerName} --format '{{json .}}'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    const data = JSON.parse(inspect);
    const state = data.State || {};

    return {
      running: state.Running || false,
      status: state.Status || 'unknown',
      health: state.Health?.Status || 'none',
      startedAt: state.StartedAt,
      uptime: state.Running ? calculateUptime(state.StartedAt) : undefined,
      pid: state.Pid,
      exitCode: state.ExitCode,
    };
  } catch (error) {
    return {
      running: false,
      status: 'not-found',
      health: 'none',
    };
  }
}

async function getAllServices(): Promise<any[]> {
  try {
    const output = execSync(
      'docker ps -a --filter "name=nexus-" --format "{{.Names}}"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    if (!output.trim()) {
      return [];
    }

    const containers = output.trim().split('\n');
    const services = await Promise.all(
      containers.map(async (container) => {
        const name = container.replace('nexus-', '').replace(/-\d+$/, '');
        const status = await getContainerStatus(container);
        return {
          name,
          container,
          ...status,
        };
      })
    );

    return services;
  } catch (error) {
    return [];
  }
}

function displayServiceStatus(serviceName: string, status: ContainerStatus): void {
  console.log(chalk.bold.cyan(`\n📊 Service Status: ${serviceName}\n`));

  const table = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [20, 60],
  });

  table.push(
    ['Running', status.running ? chalk.green('Yes') : chalk.red('No')],
    ['Status', getStatusColor(status.status)],
    ['Health', getHealthColor(status.health)]
  );

  if (status.startedAt) {
    table.push(['Started At', new Date(status.startedAt).toLocaleString()]);
  }

  if (status.uptime) {
    table.push(['Uptime', status.uptime]);
  }

  if (status.pid) {
    table.push(['PID', status.pid.toString()]);
  }

  if (status.exitCode !== undefined && status.exitCode !== 0) {
    table.push(['Exit Code', chalk.red(status.exitCode.toString())]);
  }

  console.log(table.toString() + '\n');
}

function displayAllStatus(services: any[]): void {
  if (services.length === 0) {
    console.log(chalk.yellow('\nNo services found.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Service'),
      chalk.bold('Status'),
      chalk.bold('Health'),
      chalk.bold('Uptime'),
    ],
    colWidths: [20, 15, 15, 20],
  });

  for (const service of services) {
    table.push([
      chalk.cyan(service.name),
      getStatusColor(service.status),
      getHealthColor(service.health),
      service.uptime || '-',
    ]);
  }

  console.log('\n' + table.toString() + '\n');
  console.log(chalk.dim(`Total: ${services.length} services\n`));
}

function calculateUptime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours - days * 24;
  const remainingMinutes = minutes - hours * 60;
  const remainingSeconds = seconds - minutes * 60;

  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${seconds}s`;
}

function getStatusColor(status: string): string {
  if (status === 'running') return chalk.green('Running');
  if (status === 'exited') return chalk.red('Stopped');
  if (status === 'paused') return chalk.yellow('Paused');
  if (status === 'not-found') return chalk.red('Not Found');
  return chalk.gray(status);
}

function getHealthColor(health: string): string {
  if (health === 'healthy') return chalk.green('Healthy');
  if (health === 'unhealthy') return chalk.red('Unhealthy');
  if (health === 'starting') return chalk.yellow('Starting');
  if (health === 'none') return chalk.dim('N/A');
  return chalk.gray(health);
}
