/**
 * Compute List Command
 *
 * List local compute jobs.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { LocalComputeClient } from './lib/local-compute-client.js';
import type { JobStatus, LocalComputeJob } from '@adverant-nexus/types';

interface ListOptions {
  status?: string;
  limit?: string;
  port?: string;
  json?: boolean;
}

export function createComputeListCommand(): Command {
  return new Command('list')
    .description('List local compute jobs')
    .alias('ls')
    .option('-s, --status <status>', 'Filter by status (queued, running, completed, failed, cancelled)')
    .option('-l, --limit <count>', 'Maximum number of jobs to show', '20')
    .option('-p, --port <port>', 'Agent port', '9200')
    .option('--json', 'Output as JSON')
    .action(async (options: ListOptions) => {
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

        spinner.text = 'Fetching jobs...';

        const listParams: { status?: JobStatus; limit?: number } = {};
        const statusOption = options.status;
        if (statusOption && ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(statusOption)) {
          listParams.status = statusOption as JobStatus;
        }
        listParams.limit = options.limit ? parseInt(options.limit, 10) : 20;
        const jobs = await client.listJobs(listParams);

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(jobs, null, 2));
          return;
        }

        if (jobs.length === 0) {
          console.log(chalk.gray('\nNo jobs found'));
          console.log(chalk.gray('Submit a job with: nexus compute submit <script.py>'));
          return;
        }

        displayJobsTable(jobs);
      } catch (error) {
        console.error(chalk.red('\nFailed to list jobs:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function displayJobsTable(jobs: LocalComputeJob[]): void {
  console.log();

  const table = new Table({
    head: [
      chalk.white('ID'),
      chalk.white('Name'),
      chalk.white('Status'),
      chalk.white('Framework'),
      chalk.white('Duration'),
      chalk.white('Submitted'),
    ],
    colWidths: [12, 25, 12, 12, 12, 20],
    style: { head: [], border: [] },
  });

  jobs.forEach((job) => {
    const statusColor = getStatusColor(job.status);
    const duration = getDuration(job);

    table.push([
      chalk.cyan(job.id.slice(0, 8) + '...'),
      truncate(job.name, 23),
      statusColor(job.status),
      job.framework,
      duration,
      formatDate(job.submittedAt),
    ]);
  });

  console.log(table.toString());
  console.log();
  console.log(chalk.gray(`Showing ${jobs.length} job(s)`));
  console.log();
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'queued':
      return chalk.gray;
    case 'running':
      return chalk.yellow;
    case 'completed':
      return chalk.green;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.magenta;
    default:
      return chalk.white;
  }
}

function getDuration(job: LocalComputeJob): string {
  if (job.metrics?.durationSeconds) {
    return formatDuration(job.metrics.durationSeconds);
  }

  if (job.startedAt) {
    const endTime = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    const startTime = new Date(job.startedAt).getTime();
    return formatDuration((endTime - startTime) / 1000);
  }

  return '-';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString();
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - 3) + '...';
}

export default createComputeListCommand;
