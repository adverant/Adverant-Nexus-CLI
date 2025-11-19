/**
 * Plugin Disable Command
 *
 * Disable an enabled plugin
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export function createDisableCommand(): Command {
  const command = new Command('disable');

  command
    .description('Disable a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (name: string) => {
      const spinner = ora(`Disabling plugin: ${name}...`).start();

      try {
        const pluginsDir = path.join(os.homedir(), '.nexus', 'plugins');
        const pluginPath = path.join(pluginsDir, name);

        try {
          await fs.access(pluginPath);
        } catch {
          spinner.fail(`Plugin '${name}' not found`);
          console.error(
            chalk.yellow('\nRun "nexus plugin list --all" to see installed plugins\n')
          );
          process.exit(1);
        }

        const configPath = path.join(pluginPath, '.config.json');
        await fs.writeFile(configPath, JSON.stringify({ enabled: false }, null, 2));

        spinner.succeed(chalk.green(`Plugin ${chalk.bold(name)} disabled successfully!`));

        console.log();
        console.log(chalk.dim(`To re-enable: nexus plugin enable ${name}\n`));
      } catch (error: any) {
        spinner.fail(`Failed to disable plugin: ${name}`);
        console.error(chalk.red(`\n${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
