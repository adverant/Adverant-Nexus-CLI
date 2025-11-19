/**
 * Service Ports Command
 *
 * Show service port mappings
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { execSync } from 'child_process';

interface PortMapping {
  service: string;
  host: string;
  container: string;
  protocol: string;
  url: string;
}

export function createPortsCommand(): Command {
  const command = new Command('ports');

  command
    .description('Show service port mappings')
    .argument('[service]', 'Service name (optional, shows all if omitted)')
    .option('--json', 'Output as JSON')
    .action(async (serviceName, options) => {
      try {
        if (serviceName) {
          const ports = await getServicePorts(serviceName);

          if (options.json) {
            console.log(JSON.stringify(ports, null, 2));
            return;
          }

          displayServicePorts(serviceName, ports);
        } else {
          const allPorts = await getAllPorts();

          if (options.json) {
            console.log(JSON.stringify(allPorts, null, 2));
            return;
          }

          displayAllPorts(allPorts);
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function getServicePorts(serviceName: string): Promise<PortMapping[]> {
  try {
    const containerName = `nexus-${serviceName}`;

    const inspect = execSync(
      `docker inspect ${containerName} --format '{{json .NetworkSettings.Ports}}'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    const portsData = JSON.parse(inspect);
    const ports: PortMapping[] = [];

    for (const [containerPort, hostPorts] of Object.entries(portsData)) {
      if (Array.isArray(hostPorts) && hostPorts.length > 0) {
        const [port, protocol] = containerPort.split('/');
        const hostPort = (hostPorts as any)[0].HostPort;

        ports.push({
          service: serviceName,
          host: hostPort,
          container: port || '',
          protocol: protocol || 'tcp',
          url: `http://localhost:${hostPort}`,
        });
      }
    }

    return ports;
  } catch (error) {
    return [];
  }
}

async function getAllPorts(): Promise<PortMapping[]> {
  try {
    const output = execSync(
      'docker ps -a --filter "name=nexus-" --format "{{.Names}}"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    if (!output.trim()) {
      return [];
    }

    const containers = output.trim().split('\n');
    const allPorts: PortMapping[] = [];

    for (const container of containers) {
      const serviceName = container.replace('nexus-', '').replace(/-\d+$/, '');
      const ports = await getServicePorts(serviceName);
      allPorts.push(...ports);
    }

    return allPorts;
  } catch (error) {
    return [];
  }
}

function displayServicePorts(serviceName: string, ports: PortMapping[]): void {
  console.log(chalk.bold.cyan(`\n🔌 Port Mappings: ${serviceName}\n`));

  if (ports.length === 0) {
    console.log(chalk.yellow('No port mappings found.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Host Port'),
      chalk.bold('Container Port'),
      chalk.bold('Protocol'),
      chalk.bold('URL'),
    ],
    colWidths: [15, 18, 12, 35],
  });

  for (const port of ports) {
    table.push([
      chalk.green(port.host),
      port.container,
      port.protocol,
      chalk.cyan(port.url),
    ]);
  }

  console.log(table.toString() + '\n');
}

function displayAllPorts(ports: PortMapping[]): void {
  if (ports.length === 0) {
    console.log(chalk.yellow('\nNo port mappings found.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Service'),
      chalk.bold('Host Port'),
      chalk.bold('Container Port'),
      chalk.bold('URL'),
    ],
    colWidths: [20, 12, 18, 35],
  });

  for (const port of ports) {
    table.push([
      chalk.cyan(port.service),
      chalk.green(port.host),
      port.container,
      chalk.dim(port.url),
    ]);
  }

  console.log('\n' + table.toString() + '\n');
  console.log(chalk.dim(`Total: ${ports.length} port mappings\n`));
}
