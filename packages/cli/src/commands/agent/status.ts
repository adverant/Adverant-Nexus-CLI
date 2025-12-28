/**
 * Agent Status Command
 *
 * Check the status of a running or completed agent task
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { AgentStatus } from '@adverant/nexus-cli-types';

export function createAgentStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Check agent task status')
    .requiredOption('--id <task-id>', 'Agent task ID')
    .option('--output-format <format>', 'Output format (text|json|table)', 'text')
    .option('--agent-url <url>', 'Agent service URL', 'http://localhost:9109')
    .option('--verbose', 'Show detailed information', false)
    .action(async (options) => {
      try {
        const status = await fetchAgentStatus(options.agentUrl, options.id);

        if (options.outputFormat === 'json') {
          console.log(JSON.stringify(status, null, 2));
        } else if (options.outputFormat === 'table') {
          displayStatusTable(status);
        } else {
          displayStatusText(status, options.verbose);
        }

        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function fetchAgentStatus(agentUrl: string, taskId: string): Promise<AgentStatus> {
  try {
    const response = await fetch(`${agentUrl}/tasks/${taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Task not found: ${taskId}`);
      }
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }

    return await response.json() as AgentStatus;
  } catch (error: any) {
    throw new Error(`Failed to connect to agent service: ${error.message}`);
  }
}

function displayStatusText(status: AgentStatus, verbose: boolean): void {
  console.log(chalk.bold.cyan('\n🤖 Agent Task Status\n'));

  console.log(chalk.bold('Task ID:'), status.taskId);
  console.log(chalk.bold('Status:'), getStatusDisplay(status.status));
  console.log(
    chalk.bold('Progress:'),
    `${status.currentIteration}/${status.maxIterations} iterations`
  );

  if (status.startedAt) {
    console.log(chalk.bold('Started:'), new Date(status.startedAt).toLocaleString());
  }

  if (status.completedAt) {
    console.log(chalk.bold('Completed:'), new Date(status.completedAt).toLocaleString());
  }

  if (status.estimatedCompletion && status.status === 'running') {
    console.log(
      chalk.bold('Estimated Completion:'),
      new Date(status.estimatedCompletion).toLocaleString()
    );
  }

  if (status.metadata) {
    if (status.metadata.totalCost) {
      console.log(chalk.bold('Cost:'), `$${status.metadata.totalCost.toFixed(4)}`);
    }
    if (status.metadata.tokensUsed) {
      console.log(chalk.bold('Tokens Used:'), status.metadata.tokensUsed.toLocaleString());
    }
    if (status.metadata.toolsCalled) {
      console.log(chalk.bold('Tools Called:'), status.metadata.toolsCalled);
    }
  }

  if (verbose) {
    displayDetailedProgress(status);
  }

  if (status.error) {
    console.log(chalk.bold.red('\nError:'), status.error);
  }

  if (status.result) {
    console.log(chalk.bold.green('\n✅ Result:'));
    console.log(chalk.gray('   ' + status.result.summary));

    if (status.result.artifacts && status.result.artifacts.length > 0) {
      console.log(chalk.bold('\nArtifacts:'));
      status.result.artifacts.forEach((artifact: any) => {
        console.log(chalk.gray(`   - ${artifact.name} (${artifact.type})`));
      });
    }
  }

  console.log();
}

function displayDetailedProgress(status: AgentStatus): void {
  if (status.thoughts && status.thoughts.length > 0) {
    console.log(chalk.bold('\n💭 Recent Thoughts:'));
    status.thoughts.slice(-3).forEach((thought: any) => {
      console.log(
        chalk.gray(
          `   [${thought.iteration}] ${thought.content.substring(0, 100)}${
            thought.content.length > 100 ? '...' : ''
          }`
        )
      );
    });
  }

  if (status.actions && status.actions.length > 0) {
    console.log(chalk.bold('\n⚡ Recent Actions:'));
    status.actions.slice(-3).forEach((action: any) => {
      console.log(
        chalk.gray(
          `   [${action.iteration}] ${action.action}${action.tool ? ` (${action.tool})` : ''}`
        )
      );
    });
  }

  if (status.observations && status.observations.length > 0) {
    console.log(chalk.bold('\n👁️  Recent Observations:'));
    status.observations.slice(-3).forEach((obs: any) => {
      const icon = obs.success ? '✓' : '✗';
      console.log(
        chalk.gray(
          `   [${obs.iteration}] ${icon} ${obs.content.substring(0, 100)}${
            obs.content.length > 100 ? '...' : ''
          }`
        )
      );
    });
  }
}

function displayStatusTable(status: AgentStatus): void {
  const table = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [25, 55],
  });

  table.push(
    ['Task ID', status.taskId],
    ['Status', getStatusDisplay(status.status)],
    ['Progress', `${status.currentIteration}/${status.maxIterations}`]
  );

  if (status.startedAt) {
    table.push(['Started', new Date(status.startedAt).toLocaleString()]);
  }

  if (status.completedAt) {
    table.push(['Completed', new Date(status.completedAt).toLocaleString()]);
  }

  if (status.metadata?.totalCost) {
    table.push(['Cost', `$${status.metadata.totalCost.toFixed(4)}`]);
  }

  if (status.metadata?.tokensUsed) {
    table.push(['Tokens Used', status.metadata.tokensUsed.toLocaleString()]);
  }

  if (status.result) {
    table.push(['Summary', status.result.summary]);
  }

  if (status.error) {
    table.push(['Error', status.error]);
  }

  console.log('\n' + table.toString() + '\n');
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case 'pending':
      return chalk.gray('Pending');
    case 'running':
      return chalk.yellow('Running');
    case 'completed':
      return chalk.green('Completed');
    case 'failed':
      return chalk.red('Failed');
    case 'cancelled':
      return chalk.red('Cancelled');
    default:
      return status;
  }
}
