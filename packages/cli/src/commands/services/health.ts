/**
 * Service Health Command
 *
 * Check service health endpoints
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import {
  isContainerRunning as dockerIsContainerRunning,
  getContainerStatus,
  DockerExecutionError,
  DockerErrorType,
} from '../../core/docker/docker-executor.js';

interface HealthCheck {
  service: string;
  healthy: boolean;
  status: string;
  message: string;
  responseTime?: number;
}

const SERVICE_HEALTH_ENDPOINTS: Record<string, string> = {
  'api-gateway': 'http://localhost:9000/health',
  'graphrag': 'http://localhost:9001/health',
  'mageagent': 'http://localhost:9002/health',
  'auth': 'http://localhost:9003/health',
};

export function createHealthCommand(): Command {
  const command = new Command('health');

  command
    .description('Check service health')
    .argument('[service]', 'Service name (optional)')
    .option('--all', 'Check all services')
    .option('--json', 'Output as JSON')
    .action(async (serviceName, options) => {
      try {
        if (serviceName && !options.all) {
          const health = await checkServiceHealth(serviceName);

          if (options.json) {
            console.log(JSON.stringify(health, null, 2));
            return;
          }

          displaySingleHealth(health);
          process.exit(health.healthy ? 0 : 1);
        } else {
          const spinner = ora('Checking service health...').start();
          const services = Object.keys(SERVICE_HEALTH_ENDPOINTS);
          const healthChecks = await Promise.all(
            services.map((service) => checkServiceHealth(service))
          );

          spinner.stop();

          if (options.json) {
            console.log(JSON.stringify(healthChecks, null, 2));
            return;
          }

          displayAllHealth(healthChecks);

          const allHealthy = healthChecks.every((h) => h.healthy);
          process.exit(allHealthy ? 0 : 1);
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function checkServiceHealth(serviceName: string): Promise<HealthCheck> {
  const endpoint = SERVICE_HEALTH_ENDPOINTS[serviceName];

  if (!endpoint) {
    return {
      service: serviceName,
      healthy: false,
      status: 'unknown',
      message: 'No health endpoint configured',
    };
  }

  try {
    const containerName = `nexus-${serviceName}`;
    const isRunning = await isContainerRunning(containerName);

    if (!isRunning) {
      return {
        service: serviceName,
        healthy: false,
        status: 'not-running',
        message: 'Container is not running',
      };
    }

    const startTime = Date.now();

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json() as { message?: string };
      return {
        service: serviceName,
        healthy: true,
        status: 'healthy',
        message: data.message || 'Service is healthy',
        responseTime,
      };
    } else {
      return {
        service: serviceName,
        healthy: false,
        status: 'unhealthy',
        message: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    }
  } catch (error: any) {
    return {
      service: serviceName,
      healthy: false,
      status: 'unreachable',
      message: error.message || 'Failed to reach health endpoint',
    };
  }
}

/**
 * Check if container is running using async docker executor
 * Provides better error handling and doesn't block event loop
 */
async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    return await dockerIsContainerRunning(containerName);
  } catch (error) {
    if (error instanceof DockerExecutionError) {
      // Log specific error types for better debugging
      if (error.type === DockerErrorType.NOT_RUNNING) {
        console.debug(`Docker daemon not running while checking ${containerName}`);
      } else if (error.type === DockerErrorType.PERMISSION_DENIED) {
        console.warn(`Permission denied when checking ${containerName}`);
      }
    }
    return false;
  }
}

function displaySingleHealth(health: HealthCheck): void {
  console.log(chalk.bold.cyan(`\n💊 Health Check: ${health.service}\n`));

  const table = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [20, 60],
  });

  table.push(
    ['Status', getHealthDisplay(health.status)],
    ['Healthy', health.healthy ? chalk.green('Yes') : chalk.red('No')],
    ['Message', health.message]
  );

  if (health.responseTime !== undefined) {
    table.push(['Response Time', `${health.responseTime}ms`]);
  }

  console.log(table.toString() + '\n');
}

function displayAllHealth(healthChecks: HealthCheck[]): void {
  const table = new Table({
    head: [
      chalk.bold('Service'),
      chalk.bold('Status'),
      chalk.bold('Response Time'),
      chalk.bold('Message'),
    ],
    colWidths: [20, 15, 15, 40],
  });

  for (const health of healthChecks) {
    table.push([
      chalk.cyan(health.service),
      getHealthDisplay(health.status),
      health.responseTime !== undefined ? `${health.responseTime}ms` : '-',
      health.message.substring(0, 37) + (health.message.length > 37 ? '...' : ''),
    ]);
  }

  const healthyCount = healthChecks.filter((h) => h.healthy).length;

  console.log('\n' + table.toString() + '\n');
  console.log(
    chalk.dim(
      `Health: ${healthyCount}/${healthChecks.length} services healthy\n`
    )
  );
}

function getHealthDisplay(status: string): string {
  switch (status) {
    case 'healthy':
      return chalk.green('Healthy');
    case 'unhealthy':
      return chalk.red('Unhealthy');
    case 'not-running':
      return chalk.yellow('Not Running');
    case 'unreachable':
      return chalk.red('Unreachable');
    case 'unknown':
      return chalk.gray('Unknown');
    default:
      return status;
  }
}
