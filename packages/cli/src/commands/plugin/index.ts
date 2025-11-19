/**
 * Plugin Commands
 *
 * Main plugin command with subcommands
 */

import { Command } from 'commander';
import { createInitCommand } from './init.js';
import { createInstallCommand } from './install.js';
import { createUninstallCommand } from './uninstall.js';
import { createEnableCommand } from './enable.js';
import { createDisableCommand } from './disable.js';
import { createListCommand } from './list.js';
import { createInfoCommand } from './info.js';

export function createPluginCommand(): Command {
  const command = new Command('plugin')
    .description('Manage Nexus CLI plugins');

  command.addCommand(createInitCommand());
  command.addCommand(createInstallCommand());
  command.addCommand(createUninstallCommand());
  command.addCommand(createEnableCommand());
  command.addCommand(createDisableCommand());
  command.addCommand(createListCommand());
  command.addCommand(createInfoCommand());

  return command;
}
