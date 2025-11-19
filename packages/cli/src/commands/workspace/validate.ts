/**
 * Workspace Validate Command
 *
 * Validate .nexus.toml configuration and check service availability
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
// Using YAML parser which can also handle TOML-like syntax
import yaml from 'yaml';

export function createWorkspaceValidateCommand(): Command {
  const command = new Command('validate')
    .description('Validate workspace configuration')
    .option('--check-services', 'Check service availability', false)
    .action(async (options) => {
      try {
        const cwd = process.cwd();
        const configPath = path.join(cwd, '.nexus.toml');

        console.log(chalk.bold.cyan('\nValidating Workspace Configuration\n'));

        if (!(await fs.pathExists(configPath))) {
          console.log(chalk.red('✗ .nexus.toml not found'));
          console.log(chalk.gray('  Run "nexus workspace init" to create one'));
          process.exit(1);
        }

        console.log(chalk.green('✓ .nexus.toml found'));

        const configContent = await fs.readFile(configPath, 'utf-8');
        let config: any;

        try {
          // Try parsing as YAML (supports basic TOML-like syntax)
          config = yaml.parse(configContent);
          console.log(chalk.green('✓ Valid configuration syntax'));
        } catch (error) {
          console.log(chalk.red('✗ Invalid configuration syntax'));
          console.log(chalk.gray(`  ${error instanceof Error ? error.message : String(error)}`));
          process.exit(1);
        }

        const issues: string[] = [];

        if (!config.workspace) {
          issues.push('Missing [workspace] section');
        } else {
          if (!config.workspace.name) issues.push('Missing workspace.name');
          if (!config.workspace.type) issues.push('Missing workspace.type');
        }

        if (!config.services) {
          issues.push('Missing [services] section');
        } else {
          if (!config.services.apiUrl) issues.push('Missing services.apiUrl');
          if (!config.services.mcpUrl) issues.push('Missing services.mcpUrl');
        }

        if (issues.length > 0) {
          console.log(chalk.red('\n✗ Configuration issues found:'));
          issues.forEach(issue => {
            console.log(chalk.gray(`  - ${issue}`));
          });
        } else {
          console.log(chalk.green('✓ Configuration structure valid'));
        }

        if (options.checkServices && config.services) {
          console.log(chalk.bold('\nChecking Service Availability:'));

          if (config.services.apiUrl) {
            await checkService('API Gateway', config.services.apiUrl);
          }

          if (config.services.mcpUrl) {
            await checkService('MCP Server', config.services.mcpUrl);
          }
        }

        displayWarnings(config);

        if (issues.length === 0) {
          console.log(chalk.green('\nWorkspace configuration is valid'));
          process.exit(0);
        } else {
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Check if a service is available
 */
async function checkService(name: string, url: string): Promise<void> {
  try {
    const healthUrl = new URL('/health', url).toString();
    const response = await axios.get(healthUrl, { timeout: 5000 });

    if (response.status === 200) {
      console.log(chalk.green(`  ✓ ${name} (${url})`));
    } else {
      console.log(chalk.yellow(`  ⚠ ${name} returned status ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ ${name} unavailable (${url})`));
    if (error instanceof Error) {
      console.log(chalk.gray(`    ${error.message}`));
    }
  }
}

/**
 * Display configuration warnings
 */
function displayWarnings(config: any): void {
  const warnings: string[] = [];

  if (config.services?.apiUrl?.includes('localhost')) {
    warnings.push('Using localhost for API URL - may not work in Docker containers');
  }

  if (config.agent?.maxIterations > 50) {
    warnings.push('maxIterations > 50 may result in high costs');
  }

  if (config.mcp?.autoStore === false) {
    warnings.push('MCP auto-store is disabled - results will not be saved');
  }

  if (warnings.length > 0) {
    console.log(chalk.bold.yellow('\n⚠️  Warnings:'));
    warnings.forEach(warning => {
      console.log(chalk.yellow(`  - ${warning}`));
    });
  }
}

export default createWorkspaceValidateCommand;
