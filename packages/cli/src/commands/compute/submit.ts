/**
 * Compute Submit Command
 *
 * Submit ML jobs to local compute agent.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { LocalComputeClient } from './lib/local-compute-client.js';
import type { MLFramework } from '@adverant-nexus/types';

interface SubmitOptions {
  name?: string;
  framework?: string;
  gpu?: boolean;
  cpuCores?: string;
  memory?: string;
  env?: string[];
  port?: string;
  follow?: boolean;
}

export function createComputeSubmitCommand(): Command {
  return new Command('submit')
    .description('Submit an ML job to local compute')
    .argument('<script>', 'Python script or command to run')
    .option('-n, --name <name>', 'Job name')
    .option('-f, --framework <framework>', 'ML framework (pytorch, tensorflow, mlx, jax, generic)', 'generic')
    .option('--gpu', 'Request GPU resources', true)
    .option('--cpu-cores <cores>', 'Number of CPU cores')
    .option('--memory <gb>', 'Memory limit in GB')
    .option('-e, --env <key=value>', 'Environment variables (can be repeated)', collectEnv, [])
    .option('-p, --port <port>', 'Agent port', '9200')
    .option('--follow', 'Follow job logs after submission', false)
    .action(async (script: string, options: SubmitOptions) => {
      const client = new LocalComputeClient({
        port: parseInt(options.port || '9200', 10),
      });

      try {
        // Check if agent is running
        const spinner = ora('Checking agent...').start();

        const isRunning = await client.checkHealth();

        if (!isRunning) {
          spinner.fail('Agent is not running');
          console.log(chalk.gray('\nStart the agent with: nexus compute agent start'));
          process.exit(1);
        }

        spinner.text = 'Preparing job...';

        // Determine if script is a file or inline command
        let scriptContent: string;
        let scriptPath: string | undefined;
        let workingDir: string;

        try {
          const stat = await fs.stat(script);
          if (stat.isFile()) {
            scriptPath = path.resolve(script);
            scriptContent = await fs.readFile(scriptPath, 'utf-8');
            workingDir = path.dirname(scriptPath);
          } else {
            throw new Error('Not a file');
          }
        } catch {
          // Treat as inline command
          scriptContent = script;
          workingDir = process.cwd();
        }

        // Parse environment variables
        const environment: Record<string, string> = {};
        if (options.env && Array.isArray(options.env)) {
          for (const envVar of options.env) {
            const [key, ...valueParts] = envVar.split('=');
            if (key) {
              environment[key] = valueParts.join('=');
            }
          }
        }

        // Build job name
        const jobName = options.name ||
          (scriptPath ? path.basename(scriptPath, path.extname(scriptPath)) : `job-${Date.now()}`);

        spinner.text = 'Submitting job...';

        const submitRequest: Parameters<typeof client.submitJob>[0] = {
          name: jobName,
          script: scriptContent,
          workingDir,
          environment,
          framework: (options.framework || 'generic') as MLFramework,
          resources: buildResourcesConfig(options),
        };
        if (scriptPath) submitRequest.scriptPath = scriptPath;
        const job = await client.submitJob(submitRequest);

        spinner.succeed(`Job submitted: ${chalk.cyan(job.id)}`);

        console.log();
        console.log(chalk.white(`  Name:      ${job.name}`));
        console.log(chalk.white(`  Framework: ${job.framework}`));
        console.log(chalk.white(`  GPU:       ${job.resources.gpu ? chalk.green('Yes') : chalk.gray('No')}`));
        console.log(chalk.white(`  Status:    ${chalk.yellow(job.status)}`));
        console.log();

        if (options.follow) {
          console.log(chalk.gray('Following logs...\n'));
          await client.streamLogs(job.id, (line) => {
            console.log(line);
          });
        } else {
          console.log(chalk.gray('View logs with: nexus compute logs ' + job.id));
          console.log(chalk.gray('Check status with: nexus compute status ' + job.id));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to submit job:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function collectEnv(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function buildResourcesConfig(options: SubmitOptions): { gpu: boolean; cpuCores?: number; memoryGb?: number } {
  const resources: { gpu: boolean; cpuCores?: number; memoryGb?: number } = {
    gpu: options.gpu !== false,
  };
  if (options.cpuCores) resources.cpuCores = parseInt(options.cpuCores, 10);
  if (options.memory) resources.memoryGb = parseFloat(options.memory);
  return resources;
}

export default createComputeSubmitCommand;
