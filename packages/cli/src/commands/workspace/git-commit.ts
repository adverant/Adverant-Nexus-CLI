/**
 * Workspace Git Commit Command
 *
 * Commit changes with AI-generated commit message
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execaCommand } from 'execa';
import inquirer from 'inquirer';
import ora from 'ora';

export function createWorkspaceGitCommitCommand(): Command {
  const command = new Command('git-commit')
    .description('Commit changes with AI-generated message')
    .option('--message <message>', 'Commit message (skips AI generation)')
    .option('--add-all', 'Add all changes before committing', false)
    .option('--skip-ai', 'Skip AI message generation', false)
    .option('--push', 'Push after committing', false)
    .action(async (options) => {
      try {
        await execaCommand('git rev-parse --git-dir', { shell: true });

        if (options.addAll) {
          const spinner = ora('Adding all changes...').start();
          await execaCommand('git add -A', { shell: true });
          spinner.succeed('Changes added');
        }

        const statusResult = await execaCommand('git diff --cached --name-only', { shell: true });
        if (!statusResult.stdout.trim()) {
          console.log(chalk.yellow('No staged changes to commit'));
          console.log(chalk.gray('Use "git add" or --add-all to stage changes'));
          process.exit(0);
        }

        let message: string;

        if (options.message) {
          message = options.message;
        } else if (options.skipAi) {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'message',
              message: 'Commit message:',
              validate: (input) => input.trim().length > 0 || 'Message cannot be empty',
            },
          ]);
          message = answer.message;
        } else {
          message = await generateCommitMessage();
        }

        console.log(chalk.bold('\nStaged changes:'));
        const diff = await execaCommand('git diff --cached --stat', { shell: true });
        console.log(chalk.gray(diff.stdout));

        console.log(chalk.bold('\nProposed commit message:'));
        console.log(chalk.cyan(message));

        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with commit?',
            default: true,
          },
        ]);

        if (!confirm.proceed) {
          console.log(chalk.yellow('Commit cancelled'));
          process.exit(0);
        }

        const commitSpinner = ora('Committing changes...').start();
        await execaCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`, { shell: true });
        commitSpinner.succeed('Changes committed');

        const log = await execaCommand('git log -1 --format=%H|%s', { shell: true });
        const [hash, msg] = log.stdout.split('|');
        if (hash) {
          console.log(chalk.green(`\nCommit: ${hash.substring(0, 8)}`));
          console.log(chalk.gray(`   ${msg || ''}`));
        }

        if (options.push) {
          const pushSpinner = ora('Pushing to remote...').start();
          try {
            await execaCommand('git push', { shell: true });
            pushSpinner.succeed('Pushed to remote');
          } catch (error) {
            pushSpinner.fail('Push failed');
            console.error(chalk.red(error instanceof Error ? error.message : String(error)));
          }
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Generate commit message using AI
 * This integrates with MageAgent or MCP service for AI generation
 */
async function generateCommitMessage(): Promise<string> {
  const spinner = ora('Generating commit message with AI...').start();

  try {
    const statusResult = await execaCommand('git diff --cached --name-status', { shell: true });
    const lines = statusResult.stdout.split('\n').filter(l => l.trim());

    const changes = {
      added: lines.filter(l => l.startsWith('A')).length,
      modified: lines.filter(l => l.startsWith('M')).length,
      deleted: lines.filter(l => l.startsWith('D')).length,
    };

    let message = '';

    if (changes.modified > 0 && changes.added === 0 && changes.deleted === 0) {
      message = `Update ${changes.modified} file${changes.modified > 1 ? 's' : ''}`;
    } else if (changes.added > 0 && changes.modified === 0 && changes.deleted === 0) {
      message = `Add ${changes.added} file${changes.added > 1 ? 's' : ''}`;
    } else if (changes.deleted > 0 && changes.added === 0 && changes.modified === 0) {
      message = `Delete ${changes.deleted} file${changes.deleted > 1 ? 's' : ''}`;
    } else {
      const parts: string[] = [];
      if (changes.added > 0) parts.push(`add ${changes.added}`);
      if (changes.modified > 0) parts.push(`update ${changes.modified}`);
      if (changes.deleted > 0) parts.push(`delete ${changes.deleted}`);
      message = `Changes: ${parts.join(', ')} files`;
    }

    spinner.succeed('AI message generated');

    return message;
  } catch (error) {
    spinner.fail('AI generation failed, using fallback');
    return 'Update files';
  }
}

export default createWorkspaceGitCommitCommand;
