/**
 * Session Resume Command
 *
 * Resume the most recent session
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { SessionStorage } from '../../core/session/session-storage.js';
import { SessionManager } from '../../core/session/session-manager.js';
import type { Session } from '@adverant/nexus-cli-types';

export function createSessionResumeCommand(): Command {
  const command = new Command('resume')
    .description('Resume the most recent session')
    .option('--output-format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const storage = new SessionStorage();
        const sessions = await storage.list();

        if (sessions.length === 0) {
          console.log(chalk.yellow('No sessions found to resume'));
          console.log(chalk.gray('Use "nexus session save" to create a session'));
          process.exit(0);
        }

        // Get most recent session
        const sortedSessions = sessions.sort((a, b) =>
          new Date(b.updated).getTime() - new Date(a.updated).getTime()
        );
        const mostRecent = sortedSessions[0];

        if (!mostRecent) {
          console.error(chalk.red('No sessions found'));
          process.exit(1);
        }

        const session = await storage.load(mostRecent.name);

        if (!session) {
          console.error(chalk.red('Failed to load most recent session'));
          process.exit(1);
        }

        if (options.outputFormat === 'json') {
          console.log(JSON.stringify(session, null, 2));
        } else {
          displayResumeInfo(session);
        }

        // Restore session context
        const sessionManager = new SessionManager();
        await sessionManager.restoreSession(session.name);

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Display resume information
 */
function displayResumeInfo(session: Session): void {
  console.log(chalk.bold.cyan('\nResuming Session\n'));
  console.log(chalk.bold('Name:'), session.name);
  console.log(chalk.bold('Created:'), new Date(session.created).toLocaleString());
  console.log(chalk.bold('Updated:'), new Date(session.updated).toLocaleString());

  if (session.metadata?.lastCommand) {
    console.log(chalk.bold('Last Command:'), session.metadata.lastCommand);
  }

  if (session.metadata) {
    console.log(
      chalk.gray(`\nExecuted ${session.metadata.totalCommands} commands in this session`)
    );
  }

  console.log(chalk.gray('\nSession context has been restored'));
}

export default createSessionResumeCommand;
