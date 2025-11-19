/**
 * Agent Run Command
 *
 * Executes autonomous tasks using the agent service
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import type { AgentTask, AgentStatus } from '@nexus-cli/types';

export function createAgentRunCommand(): Command {
  const command = new Command('run');

  command
    .description('Run an autonomous agent task')
    .requiredOption('--task <description>', 'Task description for the agent')
    .option('--max-iterations <n>', 'Maximum iterations', '20')
    .option('--budget <amount>', 'Cost budget in USD')
    .option('--workspace <path>', 'Workspace directory', process.cwd())
    .option('--approve-commands', 'Auto-approve safe commands', false)
    .option('--stream', 'Stream progress in real-time', true)
    .option('--output-format <format>', 'Output format (text|json)', 'text')
    .option('--agent-url <url>', 'Agent service URL', 'http://localhost:9109')
    .action(async (options) => {
      try {
        const result = await runAgentTask(options);

        if (options.outputFormat === 'json') {
          console.log(JSON.stringify(result, null, 2));
        }

        process.exit(result.success ? 0 : 1);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function runAgentTask(options: any): Promise<{ success: boolean; data?: any }> {
  const spinner = ora(chalk.cyan('Initializing agent...')).start();

  try {
    const budgetValue = options.budget ? parseFloat(options.budget) : undefined;
    const task: Partial<AgentTask> = {
      task: options.task,
      maxIterations: parseInt(options.maxIterations, 10),
      ...(budgetValue !== undefined && { budget: budgetValue }),
      workspace: options.workspace,
      approveCommands: options.approveCommands,
      stream: options.stream,
    };

    spinner.text = chalk.cyan('Submitting task to agent...');

    const response = await fetch(`${options.agentUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit task: ${response.statusText}`);
    }

    const responseData = await response.json() as { taskId: string };
    const { taskId } = responseData;

    spinner.succeed(chalk.green(`Task submitted: ${taskId}`));

    if (options.stream && options.outputFormat !== 'json') {
      return await streamProgress(options.agentUrl, taskId, spinner);
    } else {
      return await pollForCompletion(options.agentUrl, taskId, spinner);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Agent execution failed'));
    throw error;
  }
}

async function streamProgress(
  agentUrl: string,
  taskId: string,
  _spinner: any
): Promise<{ success: boolean; data?: any }> {
  console.log(chalk.cyan('\n🤖 Agent Progress:\n'));

  const pollInterval = 2000;

  while (true) {
    try {
      const response = await fetch(`${agentUrl}/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const status = await response.json() as AgentStatus;

      console.log(
        chalk.gray(`[Iteration ${status.currentIteration}/${status.maxIterations}] ${status.status}`)
      );

      if (status.status === 'completed') {
        console.log(chalk.green('\n✅ Task completed successfully!\n'));

        if (status.result?.summary) {
          console.log(chalk.bold('Summary:'));
          console.log(status.result.summary);
          console.log();
        }

        return {
          success: true,
          data: status.result,
        };
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        console.log(chalk.red(`\n❌ Task ${status.status}\n`));

        if (status.error) {
          console.log(chalk.red('Error:'), status.error);
          console.log();
        }

        return {
          success: false,
          data: { error: status.error },
        };
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error: any) {
      throw new Error(`Failed to stream progress: ${error.message}`);
    }
  }
}

async function pollForCompletion(
  agentUrl: string,
  taskId: string,
  spinner: any
): Promise<{ success: boolean; data?: any }> {
  spinner.start(chalk.cyan('Waiting for task completion...'));

  const pollInterval = 2000;
  const maxPollTime = 600000; // 10 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    try {
      const response = await fetch(`${agentUrl}/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const status = await response.json() as AgentStatus;

      spinner.text = chalk.cyan(
        `[Iteration ${status.currentIteration}/${status.maxIterations}] ${status.status}`
      );

      if (status.status === 'completed') {
        spinner.succeed(chalk.green('Task completed'));

        return {
          success: true,
          data: status.result,
        };
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        spinner.fail(chalk.red(`Task ${status.status}`));

        return {
          success: false,
          data: { error: status.error },
        };
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error: any) {
      throw new Error(`Failed to poll status: ${error.message}`);
    }
  }

  spinner.fail(chalk.red('Task timeout'));

  return {
    success: false,
    data: { error: 'Task execution timed out after 10 minutes' },
  };
}
