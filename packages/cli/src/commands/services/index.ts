/**
 * Service Management Commands
 *
 * Export all service management commands
 */

import { Command } from 'commander';
import { createListCommand } from './list.js';
import { createStatusCommand } from './status.js';
import { createHealthCommand } from './health.js';
import { createInfoCommand } from './info.js';
import { createStartCommand } from './start.js';
import { createStopCommand } from './stop.js';
import { createRestartCommand } from './restart.js';
import { createLogsCommand } from './logs.js';
import { createPortsCommand } from './ports.js';

export function createServicesCommand(): Command {
  const command = new Command('services')
    .description('Manage Nexus services')
    .alias('svc');

  // Add subcommands
  command.addCommand(createListCommand());
  command.addCommand(createStatusCommand());
  command.addCommand(createHealthCommand());
  command.addCommand(createInfoCommand());
  command.addCommand(createStartCommand());
  command.addCommand(createStopCommand());
  command.addCommand(createRestartCommand());
  command.addCommand(createLogsCommand());
  command.addCommand(createPortsCommand());

  return command;
}
