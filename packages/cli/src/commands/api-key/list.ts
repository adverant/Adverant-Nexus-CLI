/**
 * List API Keys Command
 *
 * Display all API keys for the current organization
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { APIKey } from '@adverant/nexus-cli-types';

export function createListAPIKeysCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('list');

  command
    .description('List all API keys')
    .option('-e, --env <environment>', 'Filter by environment (production|staging|development)')
    .option('--show-revoked', 'Show revoked API keys')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const spinner = ora('Fetching API keys...').start();

        try {
          // Get current organization
          const currentOrgId = await credentialsManager.getCurrentOrganizationId();
          if (!currentOrgId) {
            spinner.fail(chalk.red('No organization selected'));
            console.error(chalk.red('\n✗ No organization selected.\n'));
            console.error(chalk.yellow('  Set an organization with: nexus org switch\n'));
            process.exit(1);
          }

          // Fetch API keys
          const apiKeys = await authClient.listAPIKeys(currentOrgId);

          spinner.stop();

          // Filter by environment if specified
          let filteredKeys = apiKeys;
          if (options.env) {
            filteredKeys = apiKeys.filter(
              (key) => key.environment === options.env
            );
          }

          // Filter out revoked keys unless explicitly requested
          if (!options.showRevoked) {
            filteredKeys = filteredKeys.filter((key) => !key.revoked);
          }

          if (filteredKeys.length === 0) {
            if (options.env) {
              console.log(
                chalk.yellow(
                  `\nNo ${options.env} API keys found for this organization.`
                )
              );
            } else {
              console.log(chalk.yellow('\nNo API keys found for this organization.'));
            }
            console.log(chalk.dim('Create one with: nexus api-key create\n'));
            return;
          }

          if (options.json) {
            console.log(JSON.stringify({ api_keys: filteredKeys }, null, 2));
            return;
          }

          // Display as table
          console.log(chalk.cyan('\n🔑 API Keys:\n'));

          const table = new Table({
            head: [
              chalk.white.bold('Prefix'),
              chalk.white.bold('Name'),
              chalk.white.bold('Environment'),
              chalk.white.bold('Created'),
              chalk.white.bold('Last Used'),
              chalk.white.bold('Status'),
            ],
            style: {
              head: [],
              border: ['dim'],
            },
            colWidths: [20, 25, 15, 15, 15, 10],
          });

          filteredKeys.forEach((key: APIKey) => {
            const status = key.revoked
              ? chalk.red('Revoked')
              : key.expires_at && new Date(key.expires_at) < new Date()
                ? chalk.yellow('Expired')
                : chalk.green('Active');

            const createdDate = new Date(key.created_at).toLocaleDateString();
            const lastUsed = key.last_used_at
              ? new Date(key.last_used_at).toLocaleDateString()
              : chalk.dim('Never');

            const envColor =
              key.environment === 'production'
                ? chalk.red
                : key.environment === 'staging'
                  ? chalk.yellow
                  : chalk.blue;

            table.push([
              chalk.dim(key.key_prefix),
              key.revoked ? chalk.strikethrough(key.name) : chalk.white(key.name),
              envColor(key.environment),
              chalk.dim(createdDate),
              chalk.dim(lastUsed),
              status,
            ]);
          });

          console.log(table.toString());

          // Show summary
          const activeCount = filteredKeys.filter((k) => !k.revoked).length;
          const revokedCount = filteredKeys.filter((k) => k.revoked).length;

          console.log(chalk.dim(`\n  Total: ${filteredKeys.length} API keys`));
          console.log(chalk.dim(`  Active: ${activeCount}`));
          if (revokedCount > 0 && options.showRevoked) {
            console.log(chalk.dim(`  Revoked: ${revokedCount}`));
          }

          console.log(
            chalk.dim('\n  Use `nexus api-key info <prefix>` for detailed information\n')
          );
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to fetch API keys'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
            process.exit(1);
          } else if (error.code === 'PERMISSION_DENIED') {
            console.error(
              chalk.red('\n✗ You do not have permission to list API keys.\n')
            );
            process.exit(1);
          } else {
            console.error(chalk.red(`\n✗ ${error.message}\n`));
            process.exit(1);
          }
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
