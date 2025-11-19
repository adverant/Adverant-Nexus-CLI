/**
 * Service Info Command
 *
 * Get detailed service information
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { execSync } from 'child_process';

interface ServiceInfo {
  name: string;
  container: string;
  image: string;
  status: string;
  ports: Array<{ host: string; container: string; protocol: string }>;
  environment: Record<string, string>;
  volumes: string[];
  networks: string[];
  labels: Record<string, string>;
}

export function createInfoCommand(): Command {
  const command = new Command('info');

  command
    .description('Get detailed service information')
    .argument('<service>', 'Service name')
    .option('--json', 'Output as JSON')
    .action(async (serviceName, options) => {
      try {
        const containerName = `nexus-${serviceName}`;
        const info = await getServiceInfo(containerName, serviceName);

        if (!info) {
          console.error(chalk.red(`\nService '${serviceName}' not found.\n`));
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        displayServiceInfo(info);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function getServiceInfo(
  containerName: string,
  serviceName: string
): Promise<ServiceInfo | null> {
  try {
    const inspect = execSync(
      `docker inspect ${containerName} --format '{{json .}}'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    const data = JSON.parse(inspect);
    const config = data.Config || {};
    const networkSettings = data.NetworkSettings || {};

    const ports: Array<{ host: string; container: string; protocol: string }> = [];
    const portBindings = networkSettings.Ports || {};

    for (const [containerPort, hostPorts] of Object.entries(portBindings)) {
      if (Array.isArray(hostPorts) && hostPorts.length > 0) {
        const [port, protocol] = containerPort.split('/');
        ports.push({
          host: (hostPorts as any)[0].HostPort,
          container: port || '',
          protocol: protocol || 'tcp',
        });
      }
    }

    const environment: Record<string, string> = {};
    if (Array.isArray(config.Env)) {
      for (const env of config.Env) {
        const [key, ...valueParts] = env.split('=');
        environment[key] = valueParts.join('=');
      }
    }

    const volumes: string[] = [];
    if (Array.isArray(data.Mounts)) {
      for (const mount of data.Mounts) {
        volumes.push(`${mount.Source} → ${mount.Destination}`);
      }
    }

    const networks: string[] = Object.keys(networkSettings.Networks || {});

    return {
      name: serviceName,
      container: containerName,
      image: config.Image || 'unknown',
      status: data.State?.Status || 'unknown',
      ports,
      environment,
      volumes,
      networks,
      labels: config.Labels || {},
    };
  } catch (error) {
    return null;
  }
}

function displayServiceInfo(info: ServiceInfo): void {
  console.log(chalk.bold.cyan(`\n📋 Service Information: ${info.name}\n`));

  console.log(chalk.bold('Basic Info:'));
  const basicTable = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [20, 60],
  });

  basicTable.push(
    ['Service', chalk.cyan(info.name)],
    ['Container', info.container],
    ['Image', info.image],
    ['Status', getStatusColor(info.status)]
  );

  console.log(basicTable.toString() + '\n');

  if (info.ports.length > 0) {
    console.log(chalk.bold('Port Mappings:'));
    const portsTable = new Table({
      head: [chalk.bold('Host'), chalk.bold('Container'), chalk.bold('Protocol')],
      colWidths: [15, 15, 15],
    });

    for (const port of info.ports) {
      portsTable.push([
        chalk.green(port.host),
        port.container,
        port.protocol,
      ]);
    }

    console.log(portsTable.toString() + '\n');
  }

  if (info.networks.length > 0) {
    console.log(chalk.bold('Networks:'));
    for (const network of info.networks) {
      console.log(`  - ${chalk.cyan(network)}`);
    }
    console.log();
  }

  if (info.volumes.length > 0) {
    console.log(chalk.bold('Volumes:'));
    for (const volume of info.volumes) {
      console.log(`  - ${chalk.dim(volume)}`);
    }
    console.log();
  }

  const relevantEnv = Object.entries(info.environment).filter(
    ([key]) =>
      !key.startsWith('PATH') &&
      !key.startsWith('HOSTNAME') &&
      key.startsWith('NEXUS_') || key.startsWith('NODE_')
  );

  if (relevantEnv.length > 0) {
    console.log(chalk.bold('Environment Variables:'));
    const envTable = new Table({
      head: [chalk.bold('Variable'), chalk.bold('Value')],
      colWidths: [30, 50],
    });

    for (const [key, value] of relevantEnv) {
      const displayValue =
        value.length > 47
          ? value.substring(0, 44) + '...'
          : value;
      envTable.push([key, chalk.dim(displayValue)]);
    }

    console.log(envTable.toString() + '\n');
  }
}

function getStatusColor(status: string): string {
  if (status === 'running') return chalk.green('Running');
  if (status === 'exited') return chalk.red('Stopped');
  if (status === 'paused') return chalk.yellow('Paused');
  return chalk.gray(status);
}
