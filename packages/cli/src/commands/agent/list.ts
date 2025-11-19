/**
 * Agent List Command
 *
 * List all active and recent agent tasks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { AgentStatus } from '@nexus-cli/types';

export function createAgentListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all agent tasks')
    .option('--status <status>', 'Filter by status (running|completed|failed)', '')
    .option('--limit <n>', 'Maximum number of tasks to show', '20')
    .option('--output-format <format>', 'Output format (text|json|table)', 'table')
    .option('--agent-url <url>', 'Agent service URL', 'http://localhost:9109')
    .action(async (options) => {
      try {
        let tasks = await fetchAgentTasks(options.agentUrl);

        if (options.status) {
          tasks = tasks.filter((task) => task.status === options.status);
        }

        const limit = parseInt(options.limit, 10);
        tasks = tasks.slice(0, limit);

        if (options.outputFormat === 'json') {
          console.log(JSON.stringify(tasks, null, 2));
        } else if (options.outputFormat === 'table') {
          displayTasksTable(tasks);
        } else {
          displayTasksText(tasks);
        }

        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function fetchAgentTasks(agentUrl: string): Promise<AgentStatus[]> {
  try {
    const response = await fetch(`${agentUrl}/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error: any) {
    throw new Error(`Failed to connect to agent service: ${error.message}`);
  }
}

function displayTasksText(tasks: AgentStatus[]): void {
  if (tasks.length === 0) {
    console.log(chalk.yellow('\nNo agent tasks found\n'));
    return;
  }

  console.log(chalk.bold.cyan(`\n🤖 Agent Tasks (${tasks.length})\n`));

  tasks.forEach((task) => {
    console.log(chalk.bold('Task ID:'), task.taskId);
    console.log(chalk.bold('Status:'), getStatusDisplay(task.status));
    console.log(
      chalk.bold('Progress:'),
      `${task.currentIteration}/${task.maxIterations} iterations`
    );

    if (task.startedAt) {
      console.log(chalk.bold('Started:'), new Date(task.startedAt).toLocaleString());
    }

    if (task.result?.summary) {
      console.log(
        chalk.bold('Summary:'),
        task.result.summary.substring(0, 80) + (task.result.summary.length > 80 ? '...' : '')
      );
    }

    console.log();
  });
}

function displayTasksTable(tasks: AgentStatus[]): void {
  if (tasks.length === 0) {
    console.log(chalk.yellow('\nNo agent tasks found\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Task ID'),
      chalk.bold('Status'),
      chalk.bold('Progress'),
      chalk.bold('Started'),
      chalk.bold('Summary'),
    ],
    colWidths: [15, 12, 12, 20, 45],
  });

  tasks.forEach((task) => {
    table.push([
      task.taskId.substring(0, 12) + '...',
      getStatusDisplay(task.status),
      `${task.currentIteration}/${task.maxIterations}`,
      task.startedAt ? new Date(task.startedAt).toLocaleString() : '-',
      task.result?.summary
        ? task.result.summary.substring(0, 42) + '...'
        : task.error
        ? chalk.red('Error: ' + task.error.substring(0, 35))
        : '-',
    ]);
  });

  console.log('\n' + table.toString() + '\n');
  console.log(chalk.gray(`Showing ${tasks.length} tasks\n`));
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case 'pending':
      return chalk.gray('Pending');
    case 'running':
      return chalk.yellow('Running');
    case 'completed':
      return chalk.green('Complete');
    case 'failed':
      return chalk.red('Failed');
    case 'cancelled':
      return chalk.red('Cancelled');
    default:
      return status;
  }
}
