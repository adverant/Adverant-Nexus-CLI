/**
 * Plugin List Command
 *
 * List installed plugins
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  commands: number;
}

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List installed plugins')
    .option('-a, --all', 'Show all plugins (including disabled)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const plugins = await getInstalledPlugins();

        const filteredPlugins = options.all
          ? plugins
          : plugins.filter((p) => p.enabled);

        if (filteredPlugins.length === 0) {
          console.log(chalk.yellow('\nNo plugins installed'));
          console.log();
          console.log(chalk.dim('To install a plugin, run:'));
          console.log(chalk.dim('  nexus plugin install <path>\n'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(filteredPlugins, null, 2));
          return;
        }

        const table = new Table({
          head: [
            chalk.bold('Plugin'),
            chalk.bold('Version'),
            chalk.bold('Status'),
            chalk.bold('Commands'),
            chalk.bold('Description'),
          ],
          colWidths: [20, 10, 10, 10, 40],
        });

        for (const plugin of filteredPlugins) {
          table.push([
            chalk.cyan(plugin.name),
            plugin.version,
            plugin.enabled ? chalk.green('enabled') : chalk.gray('disabled'),
            plugin.commands.toString(),
            plugin.description || '-',
          ]);
        }

        console.log('\n' + table.toString() + '\n');
        console.log(
          chalk.dim(
            `Total: ${filteredPlugins.length} plugin${filteredPlugins.length !== 1 ? 's' : ''}\n`
          )
        );
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function getInstalledPlugins(): Promise<Plugin[]> {
  const pluginsDir = path.join(os.homedir(), '.nexus', 'plugins');

  try {
    await fs.access(pluginsDir);
  } catch {
    return [];
  }

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    const plugins: Plugin[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginsDir, entry.name);
        const manifestPath = path.join(pluginPath, 'package.json');

        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          const configPath = path.join(pluginPath, '.config.json');
          let enabled = true;

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            enabled = config.enabled !== false;
          } catch {
            // Default to enabled if no config
          }

          plugins.push({
            name: manifest.name || entry.name,
            version: manifest.version || '0.0.0',
            description: manifest.description || '',
            author: manifest.author,
            enabled,
            commands: manifest.nexus?.commands?.length || 0,
          });
        } catch {
          // Skip invalid plugins
        }
      }
    }

    return plugins;
  } catch {
    return [];
  }
}
