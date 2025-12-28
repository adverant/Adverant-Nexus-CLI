/**
 * Delete (Revoke) API Key Command
 *
 * Revoke an API key permanently
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { APIKey } from '@adverant/nexus-cli-types';

export function createDeleteAPIKeyCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('delete');

  command
    .description('Revoke an API key')
    .argument('<key-id-or-prefix>', 'API key ID or prefix')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (keyIdOrPrefix: string, options) => {
      try {
        const spinner = ora('Finding API key...').start();

        try {
          // Get current organization
          const currentOrgId = await credentialsManager.getCurrentOrganizationId();
          if (!currentOrgId) {
            spinner.fail(chalk.red('No organization selected'));
            console.error(chalk.red('\n✗ No organization selected.\n'));
            console.error(chalk.yellow('  Set an organization with: nexus org switch\n'));
            process.exit(1);
          }

          // Fetch all API keys to find the matching one
          const apiKeys = await authClient.listAPIKeys(currentOrgId);

          // Find API key by ID or prefix
          let apiKey: APIKey | undefined;

          // First try exact ID match
          apiKey = apiKeys.find((k) => k.id === keyIdOrPrefix);

          // If not found, try prefix match
          if (!apiKey) {
            const prefixMatches = apiKeys.filter((k) =>
              k.key_prefix.startsWith(keyIdOrPrefix)
            );

            if (prefixMatches.length === 0) {
              spinner.fail(chalk.red('API key not found'));
              console.error(
                chalk.red(`\n✗ No API key found matching '${keyIdOrPrefix}'.\n`)
              );
              console.error(chalk.dim('  Use `nexus api-key list` to see available keys\n'));
              process.exit(1);
            }

            if (prefixMatches.length > 1) {
              spinner.fail(chalk.red('Multiple matches found'));
              console.error(
                chalk.red(`\n✗ Multiple API keys match '${keyIdOrPrefix}':\n`)
              );
              prefixMatches.forEach((k) => {
                console.error(chalk.dim(`  • ${k.key_prefix} - ${k.name}`));
              });
              console.error(chalk.yellow('\n  Please use a more specific prefix or ID\n'));
              process.exit(1);
            }

            apiKey = prefixMatches[0];
          }

          spinner.stop();

          // TypeScript guard - apiKey is guaranteed to be defined here
          if (!apiKey) {
            throw new Error('Internal error: apiKey not found');
          }

          // Check if already revoked
          if (apiKey.revoked) {
            console.log(
              chalk.yellow(`\n⚠️  API key '${apiKey.name}' is already revoked.\n`)
            );
            return;
          }

          // Display API key details
          console.log(chalk.cyan('\n🔑 API Key Details:\n'));
          console.log(`  Name: ${chalk.white(apiKey.name)}`);
          console.log(`  Prefix: ${chalk.dim(apiKey.key_prefix)}`);
          console.log(`  Environment: ${chalk.white(apiKey.environment)}`);
          console.log(
            `  Created: ${chalk.dim(new Date(apiKey.created_at).toLocaleDateString())}`
          );

          if (apiKey.last_used_at) {
            console.log(
              `  Last Used: ${chalk.dim(new Date(apiKey.last_used_at).toLocaleDateString())}`
            );
          }

          // Confirmation prompt unless forced
          if (!options.force) {
            console.log(
              chalk.red.bold(
                '\n⚠️  WARNING: This action cannot be undone. The API key will be permanently revoked.'
              )
            );

            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to revoke '${apiKey.name}'?`,
                default: false,
              },
            ]);

            if (!confirm) {
              console.log(chalk.yellow('\nRevocation cancelled.\n'));
              return;
            }
          }

          // Revoke API key
          const revokeSpinner = ora('Revoking API key...').start();

          try {
            await authClient.revokeAPIKey(apiKey.id);

            revokeSpinner.succeed(chalk.green('API key revoked successfully!'));

            // Remove from local references
            await credentialsManager.removeAPIKeyReference(apiKey.id);

            console.log(chalk.dim('\n  The API key has been permanently revoked.'));
            console.log(
              chalk.dim('  All future requests using this key will be rejected.\n')
            );
          } catch (revokeError: any) {
            revokeSpinner.fail(chalk.red('Failed to revoke API key'));

            if (revokeError.code === 'APIKEY_NOT_FOUND') {
              console.error(chalk.red('\n✗ API key not found or already revoked.\n'));
            } else if (revokeError.code === 'PERMISSION_DENIED') {
              console.error(
                chalk.red('\n✗ You do not have permission to revoke this API key.\n')
              );
            } else {
              console.error(chalk.red(`\n✗ ${revokeError.message}\n`));
            }

            process.exit(1);
          }
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to find API key'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
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
