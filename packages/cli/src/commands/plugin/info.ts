/**
 * Plugin Info Command
 *
 * Show detailed information about a plugin
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export function createInfoCommand(): Command {
  const command = new Command('info');

  command
    .description('Show plugin information')
    .argument('<name>', 'Plugin name')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options) => {
      try {
        const pluginsDir = path.join(os.homedir(), '.nexus', 'plugins');
        const pluginPath = path.join(pluginsDir, name);

        try {
          await fs.access(pluginPath);
        } catch {
          console.log(chalk.red(`\nPlugin '${name}' not found`));
          console.log();
          console.log(chalk.dim('To see all plugins, run:'));
          console.log(chalk.dim('  nexus plugin list --all\n'));
          process.exit(1);
        }

        const manifestPath = path.join(pluginPath, 'package.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        const configPath = path.join(pluginPath, '.config.json');
        let enabled = true;

        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          enabled = config.enabled !== false;
        } catch {
          // Default to enabled
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                author: manifest.author,
                homepage: manifest.homepage,
                repository: manifest.repository,
                enabled,
                main: manifest.main,
                commands: manifest.nexus?.commands || [],
                dependencies: manifest.dependencies,
                permissions: manifest.nexus?.permissions || [],
              },
              null,
              2
            )
          );
          return;
        }

        console.log();
        console.log(
          boxen(
            `${chalk.bold.cyan(manifest.name)} ${chalk.gray(`v${manifest.version}`)}`,
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'cyan',
            }
          )
        );

        console.log(chalk.bold('Description:'));
        console.log(`  ${manifest.description || '-'}`);
        console.log();

        console.log(chalk.bold('Author:'));
        console.log(`  ${manifest.author || '-'}`);
        console.log();

        if (manifest.homepage) {
          console.log(chalk.bold('Homepage:'));
          console.log(`  ${manifest.homepage}`);
          console.log();
        }

        if (manifest.repository) {
          console.log(chalk.bold('Repository:'));
          console.log(`  ${typeof manifest.repository === 'string' ? manifest.repository : manifest.repository.url || '-'}`);
          console.log();
        }

        console.log(chalk.bold('Status:'));
        console.log(`  ${enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log();

        if (manifest.nexus?.commands?.length > 0) {
          console.log(chalk.bold('Commands:'));
          manifest.nexus.commands.forEach((cmd: any) => {
            console.log(`  ${chalk.cyan(cmd.name)}`);
            console.log(`    ${cmd.description || '-'}`);

            if (cmd.args && cmd.args.length > 0) {
              console.log(`    Arguments:`);
              cmd.args.forEach((arg: any) => {
                const required = arg.required ? chalk.red('*') : '';
                console.log(
                  `      ${arg.name}${required} (${arg.type}): ${arg.description}`
                );
              });
            }

            if (cmd.options && cmd.options.length > 0) {
              console.log(`    Options:`);
              cmd.options.forEach((opt: any) => {
                const short = opt.short ? `-${opt.short}, ` : '';
                console.log(
                  `      ${short}--${opt.long} (${opt.type}): ${opt.description}`
                );
              });
            }

            console.log();
          });
        }

        if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
          console.log(chalk.bold('Dependencies:'));
          for (const [dep, version] of Object.entries(manifest.dependencies)) {
            console.log(`  - ${dep}@${version}`);
          }
          console.log();
        }

        if (manifest.nexus?.permissions?.length > 0) {
          console.log(chalk.bold('Permissions:'));
          manifest.nexus.permissions.forEach((perm: string) => {
            console.log(`  - ${perm}`);
          });
          console.log();
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
