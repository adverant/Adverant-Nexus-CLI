/**
 * Session Save Command
 *
 * Save current session state to disk
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { SessionStorage } from '../../core/session/session-storage.js';
import { SessionManager } from '../../core/session/session-manager.js';
import type { Session } from '@nexus-cli/types';

export function createSessionSaveCommand(): Command {
  const command = new Command('save')
    .description('Save current session')
    .argument('[name]', 'Session name')
    .option('--auto', 'Auto-generate session name with timestamp', false)
    .option('--tags <tags...>', 'Tags for the session')
    .action(async (name: string | undefined, options) => {
      try {
        const storage = new SessionStorage();
        const sessionManager = new SessionManager();

        // Generate name if not provided or auto mode
        const sessionName = options.auto || !name
          ? generateSessionName()
          : name;

        // Get current session context
        const currentSession = sessionManager.getCurrentSession();
        const history = sessionManager.getHistory();

        // Create session object
        const session: Session = {
          id: currentSession?.id || uuidv4(),
          name: sessionName,
          created: currentSession?.created || new Date(),
          updated: new Date(),
          context: {
            cwd: process.cwd(),
            config: {},
            environment: {},
            services: {},
          },
          history: history || [],
          results: [],
          mcpMemories: [],
          metadata: {
            totalCommands: history?.length || 0,
            successfulCommands: history?.filter(h => h.success).length || 0,
            failedCommands: history?.filter(h => !h.success).length || 0,
            totalDuration: history?.reduce((sum, h) => sum + h.duration, 0) || 0,
            tags: options.tags || [],
          },
        };

        await storage.save(session);

        console.log(chalk.green('Session saved successfully'));
        console.log(chalk.bold('Name:'), sessionName);
        console.log(chalk.bold('ID:'), session.id);
        console.log(chalk.bold('Location:'), `~/.nexus/sessions/${sessionName}.json`);

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Generate session name with timestamp
 */
function generateSessionName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  return `session-${timestamp}`;
}

export default createSessionSaveCommand;
