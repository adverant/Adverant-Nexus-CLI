/**
 * Plugin Uninstall Command
 *
 * Uninstall a plugin
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export function createUninstallCommand(): Command {
  const command = new Command('uninstall');

  command
    .description('Uninstall a plugin')
    .argument('<name>', 'Plugin name')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (name: string, options) => {
      try {
        const pluginsDir = path.join(os.homedir(), '.nexus', 'plugins');
        const pluginPath = path.join(pluginsDir, name);

        try {
          await fs.access(pluginPath);
        } catch {
          console.log(chalk.red(`\nPlugin '${name}' not found\n`));
          process.exit(1);
        }

        if (!options.yes) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to uninstall ${chalk.bold(name)}?`,
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow('\nUninstallation cancelled\n'));
            return;
          }
        }

        const spinner = ora(`Uninstalling plugin: ${name}...`).start();

        await fs.rm(pluginPath, { recursive: true, force: true });

        spinner.succeed(chalk.green(`Plugin ${chalk.bold(name)} uninstalled successfully!\n`));
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
