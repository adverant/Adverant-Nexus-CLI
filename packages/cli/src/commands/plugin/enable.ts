/**
 * Plugin Enable Command
 *
 * Enable a disabled plugin
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export function createEnableCommand(): Command {
  const command = new Command('enable');

  command
    .description('Enable a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (name: string) => {
      const spinner = ora(`Enabling plugin: ${name}...`).start();

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
        await fs.writeFile(configPath, JSON.stringify({ enabled: true }, null, 2));

        spinner.succeed(chalk.green(`Plugin ${chalk.bold(name)} enabled successfully!`));

        try {
          const manifestPath = path.join(pluginPath, 'package.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          if (manifest.nexus?.commands?.length > 0) {
            console.log();
            console.log(chalk.bold('Available Commands:'));
            manifest.nexus.commands.forEach((cmd: any) => {
              console.log(`  - ${chalk.cyan(cmd.name)}: ${cmd.description || '-'}`);
            });
            console.log();
          }
        } catch {
          // Ignore manifest errors
        }
      } catch (error: any) {
        spinner.fail(`Failed to enable plugin: ${name}`);
        console.error(chalk.red(`\n${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
