/**
 * Plugin Install Command
 *
 * Install a plugin from local path or registry
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execSync } from 'child_process';

export function createInstallCommand(): Command {
  const command = new Command('install');

  command
    .description('Install a plugin')
    .argument('<path-or-name>', 'Plugin path or name')
    .option('--no-enable', 'Do not enable plugin after installation')
    .action(async (pathOrName: string, options) => {
      const spinner = ora('Installing plugin...').start();

      try {
        const pluginPath = path.resolve(process.cwd(), pathOrName);

        const manifestPath = path.join(pluginPath, 'package.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        if (!manifest.nexus?.plugin) {
          throw new Error('Not a valid Nexus plugin (missing nexus.plugin in package.json)');
        }

        const pluginsDir = path.join(os.homedir(), '.nexus', 'plugins');
        await fs.mkdir(pluginsDir, { recursive: true });

        const targetPath = path.join(pluginsDir, manifest.name);

        spinner.text = `Installing ${manifest.name}...`;

        if (manifest.main?.endsWith('.ts') || manifest.devDependencies?.typescript) {
          spinner.text = `Building ${manifest.name}...`;

          execSync('npm install && npm run build', {
            cwd: pluginPath,
            stdio: 'ignore',
          });
        }

        await fs.cp(pluginPath, targetPath, { recursive: true });

        spinner.text = `Plugin installed: ${manifest.name}`;

        if (options.enable !== false) {
          const configPath = path.join(targetPath, '.config.json');
          await fs.writeFile(
            configPath,
            JSON.stringify({ enabled: true }, null, 2)
          );

          spinner.succeed(
            chalk.green(`Plugin ${chalk.bold(manifest.name)} installed and enabled successfully!`)
          );
        } else {
          spinner.succeed(
            chalk.green(`Plugin ${chalk.bold(manifest.name)} installed successfully!`)
          );
        }

        console.log();
        console.log(chalk.bold('Plugin Info:'));
        console.log(`  Name: ${manifest.name}`);
        console.log(`  Version: ${manifest.version}`);
        console.log(`  Description: ${manifest.description || '-'}`);
        console.log(`  Author: ${manifest.author || '-'}`);
        console.log(`  Commands: ${manifest.nexus?.commands?.length || 0}`);

        if (manifest.nexus?.commands?.length > 0) {
          console.log();
          console.log(chalk.bold('Available Commands:'));
          manifest.nexus.commands.forEach((cmd: any) => {
            console.log(`  - ${chalk.cyan(cmd.name)}: ${cmd.description || '-'}`);
          });
        }

        console.log();
        console.log(
          chalk.dim(`Use ${chalk.bold(`nexus ${manifest.name} <command>`)} to run plugin commands\n`)
        );
      } catch (error: any) {
        spinner.fail('Failed to install plugin');

        if (error.code === 'ENOENT') {
          console.error(chalk.red('\nPlugin path not found'));
          console.error(chalk.dim(`  Path: ${pathOrName}\n`));
        } else {
          console.error(chalk.red(`\n${error.message}\n`));
        }

        process.exit(1);
      }
    });

  return command;
}
