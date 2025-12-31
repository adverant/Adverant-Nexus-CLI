/**
 * Temperature Command
 *
 * Manage the optional temperature daemon for macOS.
 * The daemon allows reading CPU/GPU temperature without running the entire CLI as root.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  installDaemon,
  uninstallDaemon,
  getDaemonStatus,
  isDaemonInstalled,
  readTemperatureFromDaemon,
} from './lib/temperature-daemon.js';

export function createTemperatureCommand(): Command {
  const command = new Command('temperature')
    .alias('temp')
    .description('Manage temperature monitoring daemon (macOS only)');

  // Status subcommand
  command
    .command('status')
    .description('Check temperature daemon status')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      const status = getDaemonStatus();

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log();
      console.log(chalk.cyan.bold('Temperature Daemon Status'));
      console.log(chalk.gray('─'.repeat(50)));

      const installedStatus = status.installed
        ? chalk.green('Installed')
        : chalk.yellow('Not installed');
      const runningStatus = status.running
        ? chalk.green('Running')
        : chalk.gray('Stopped');

      console.log(`  Installed:       ${installedStatus}`);
      console.log(`  Running:         ${runningStatus}`);

      if (status.lastReading) {
        console.log();
        console.log(chalk.white.bold('Current Temperature'));
        console.log(chalk.gray('─'.repeat(50)));

        if (status.lastReading.cpu !== undefined) {
          const tempColor = getTempColor(status.lastReading.cpu);
          console.log(`  CPU:             ${tempColor(`${status.lastReading.cpu.toFixed(1)}°C`)}`);
        }
        if (status.lastReading.gpu !== undefined) {
          const tempColor = getTempColor(status.lastReading.gpu);
          console.log(`  GPU:             ${tempColor(`${status.lastReading.gpu.toFixed(1)}°C`)}`);
        }
        if (status.lastReading.soc !== undefined) {
          const tempColor = getTempColor(status.lastReading.soc);
          console.log(`  SoC:             ${tempColor(`${status.lastReading.soc.toFixed(1)}°C`)}`);
        }
        if (status.lastReading.error) {
          console.log(`  Error:           ${chalk.red(status.lastReading.error)}`);
        }

        const timestamp = new Date(status.lastReading.timestamp);
        console.log(`  Last Updated:    ${chalk.gray(timestamp.toLocaleString())}`);
      } else if (status.installed && !status.running) {
        console.log();
        console.log(chalk.yellow('  Daemon is installed but not running.'));
        console.log(chalk.gray('  It may need to be reloaded after a system restart.'));
      } else if (!status.installed) {
        console.log();
        console.log(chalk.gray('  Temperature monitoring requires the daemon to be installed.'));
        console.log(chalk.gray('  Run: nexus compute temperature install'));
      }

      console.log();
    });

  // Install subcommand
  command
    .command('install')
    .description('Install the temperature monitoring daemon (requires sudo)')
    .action(async () => {
      if (process.platform !== 'darwin') {
        console.log(chalk.red('\nTemperature daemon is only supported on macOS.'));
        process.exit(1);
      }

      if (isDaemonInstalled()) {
        console.log(chalk.yellow('\nTemperature daemon is already installed.'));
        console.log(chalk.gray('Use "nexus compute temperature status" to check its status.'));
        return;
      }

      console.log();
      console.log(chalk.cyan.bold('Installing Temperature Daemon'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('This will install a LaunchDaemon that:');
      console.log(chalk.gray('  • Runs as root to access temperature sensors'));
      console.log(chalk.gray('  • Reads temperature every 5 seconds'));
      console.log(chalk.gray('  • Writes data to ~/.nexus/temperature.json'));
      console.log(chalk.gray('  • Starts automatically on boot'));
      console.log();
      console.log(chalk.yellow('You will be prompted for your administrator password.'));
      console.log();

      const result = await installDaemon();

      if (result.success) {
        console.log();
        console.log(chalk.green('✓ ') + result.message);
        console.log();

        // Show current temperature
        const temp = readTemperatureFromDaemon();
        if (temp && !temp.error) {
          console.log(chalk.white.bold('Current Temperature Reading:'));
          if (temp.cpu !== undefined) {
            console.log(`  CPU: ${getTempColor(temp.cpu)(`${temp.cpu.toFixed(1)}°C`)}`);
          }
          if (temp.gpu !== undefined) {
            console.log(`  GPU: ${getTempColor(temp.gpu)(`${temp.gpu.toFixed(1)}°C`)}`);
          }
          if (temp.soc !== undefined) {
            console.log(`  SoC: ${getTempColor(temp.soc)(`${temp.soc.toFixed(1)}°C`)}`);
          }
          console.log();
        }
      } else {
        console.log();
        console.log(chalk.red('✗ ') + result.message);
        process.exit(1);
      }
    });

  // Uninstall subcommand
  command
    .command('uninstall')
    .description('Uninstall the temperature monitoring daemon (requires sudo)')
    .action(async () => {
      if (!isDaemonInstalled()) {
        console.log(chalk.yellow('\nTemperature daemon is not installed.'));
        return;
      }

      console.log();
      console.log(chalk.cyan.bold('Uninstalling Temperature Daemon'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.yellow('You will be prompted for your administrator password.'));
      console.log();

      const result = await uninstallDaemon();

      if (result.success) {
        console.log();
        console.log(chalk.green('✓ ') + result.message);
        console.log();
        console.log(chalk.gray('Temperature will no longer be reported by the compute agent.'));
        console.log();
      } else {
        console.log();
        console.log(chalk.red('✗ ') + result.message);
        process.exit(1);
      }
    });

  // Default action when no subcommand provided
  command.action(() => {
    command.outputHelp();
  });

  return command;
}

/**
 * Get color function based on temperature
 */
function getTempColor(temp: number): (text: string) => string {
  if (temp >= 90) return chalk.red;
  if (temp >= 75) return chalk.yellow;
  if (temp >= 50) return chalk.cyan;
  return chalk.green;
}

export default createTemperatureCommand;
