/**
 * Agent Commands
 *
 * Commands for autonomous agent mode
 */

import { Command } from 'commander';
import { createAgentRunCommand } from './run.js';
import { createAgentStatusCommand } from './status.js';
import { createAgentListCommand } from './list.js';

export function createAgentCommand(): Command {
  const command = new Command('agent')
    .description('Autonomous agent commands');

  command.addCommand(createAgentRunCommand());
  command.addCommand(createAgentStatusCommand());
  command.addCommand(createAgentListCommand());

  return command;
}
