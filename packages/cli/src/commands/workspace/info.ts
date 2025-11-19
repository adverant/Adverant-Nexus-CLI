/**
 * Workspace Info Command
 *
 * Display workspace information including detected project type,
 * git status, docker-compose files, and available services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { WorkspaceDetector } from '../../core/config/workspace-detector.js';
import type { WorkspaceInfo } from '../../core/config/workspace-detector.js';

export function createWorkspaceInfoCommand(): Command {
  const command = new Command('info')
    .description('Show workspace information')
    .option('--output-format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const cwd = process.cwd();
        const detector = new WorkspaceDetector(cwd);
        const info = await detector.detect();

        if (options.outputFormat === 'json') {
          console.log(JSON.stringify(info, null, 2));
        } else {
          displayWorkspaceInfo(info);
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Display workspace info
 */
function displayWorkspaceInfo(info: WorkspaceInfo): void {
  console.log(chalk.bold.cyan('\nWorkspace Information\n'));

  console.log(chalk.bold('Path:'), info.cwd);
  console.log(chalk.bold('Project Type:'), info.type);
  console.log(chalk.bold('Name:'), info.name);

  if (info.packageManager) {
    console.log(chalk.bold('Package Manager:'), info.packageManager);
  }

  console.log(chalk.bold('\nGit:'));
  if (info.gitRepo) {
    console.log(chalk.green('  ✓ Git repository'));
    if (info.gitBranch) {
      console.log(chalk.gray(`  Branch: ${info.gitBranch}`));
    }
    if (info.gitRemote) {
      console.log(chalk.gray(`  Remote: ${info.gitRemote}`));
    }
    if (info.gitStatus) {
      const statusColor = info.gitStatus === 'clean' ? chalk.green : chalk.yellow;
      console.log(statusColor(`  Status: ${info.gitStatus}`));
    }
  } else {
    console.log(chalk.gray('  Not a git repository'));
  }

  console.log(chalk.bold('\nDocker Compose:'));
  if (info.dockerComposeFiles.length > 0) {
    console.log(chalk.green(`  ✓ Found ${info.dockerComposeFiles.length} file(s)`));
    info.dockerComposeFiles.forEach((file) => {
      const relPath = path.relative(info.cwd, file);
      console.log(chalk.gray(`    - ${relPath}`));
    });
  } else {
    console.log(chalk.gray('  No docker-compose files found'));
  }

  console.log(chalk.bold('\nNexus Configuration:'));
  if (info.nexusConfig) {
    console.log(chalk.green('  ✓ .nexus.toml found'));
  } else {
    console.log(chalk.gray('  No .nexus.toml found'));
    console.log(chalk.gray('  Run "nexus workspace init" to create one'));
  }
}

export default createWorkspaceInfoCommand;
