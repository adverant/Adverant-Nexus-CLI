/**
 * Compute Logs Command
 *
 * View or stream logs from compute jobs.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LocalComputeClient } from './lib/local-compute-client.js';

interface LogsOptions {
  follow?: boolean;
  tail?: string;
  port?: string;
}

export function createComputeLogsCommand(): Command {
  return new Command('logs')
    .description('View logs from a compute job')
    .argument('<jobId>', 'Job ID to view logs for')
    .option('-f, --follow', 'Follow log output in real-time', false)
    .option('-t, --tail <lines>', 'Number of lines to show from end', '100')
    .option('-p, --port <port>', 'Agent port', '9200')
    .action(async (jobId: string, options: LogsOptions) => {
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

        spinner.stop();

        // Get job to verify it exists
        const job = await client.getJob(jobId);

        if (!job) {
          console.log(chalk.red(`\nJob ${jobId} not found`));
          process.exit(1);
        }

        console.log(chalk.cyan(`\nLogs for job: ${job.name} (${job.id})`));
        console.log(chalk.gray('─'.repeat(60)));
        console.log();

        if (options.follow) {
          // Stream logs in real-time
          await client.streamLogs(jobId, (line) => {
            console.log(line);
          });
        } else {
          // Get existing logs
          const tailLines = parseInt(options.tail || '100', 10);
          const logs = await client.getJobLogs(jobId, tailLines);

          if (logs.length === 0) {
            console.log(chalk.gray('No logs available yet'));
          } else {
            logs.forEach((line) => {
              // Color stderr lines differently
              if (line.startsWith('[stderr]')) {
                console.log(chalk.yellow(line));
              } else {
                console.log(line);
              }
            });
          }

          console.log();
          console.log(chalk.gray('─'.repeat(60)));

          // Show job status
          const statusColor = job.status === 'completed' ? chalk.green :
                             job.status === 'failed' ? chalk.red :
                             job.status === 'running' ? chalk.yellow : chalk.gray;

          console.log(`Status: ${statusColor(job.status)}`);

          if (job.exitCode !== undefined) {
            const exitColor = job.exitCode === 0 ? chalk.green : chalk.red;
            console.log(`Exit Code: ${exitColor(job.exitCode.toString())}`);
          }

          if (job.error) {
            console.log(chalk.red(`Error: ${job.error}`));
          }

          if (job.status === 'running') {
            console.log(chalk.gray('\nUse --follow to stream logs in real-time'));
          }
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to get logs:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

export default createComputeLogsCommand;
