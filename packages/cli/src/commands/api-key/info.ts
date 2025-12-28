/**
 * API Key Info Command
 *
 * Display detailed information about an API key
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { APIKey } from '@adverant/nexus-cli-types';

export function createAPIKeyInfoCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('info');

  command
    .description('Show detailed API key information')
    .argument('<key-id-or-prefix>', 'API key ID or prefix')
    .option('-j, --json', 'Output as JSON')
    .action(async (keyIdOrPrefix: string, options) => {
      try {
        const spinner = ora('Fetching API key information...').start();

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

          // TypeScript guard - apiKey is guaranteed to be defined here
          if (!apiKey) {
            throw new Error('Internal error: apiKey not found');
          }

          // Get detailed info
          const detailedKey = await authClient.getAPIKey(apiKey.id);

          spinner.stop();

          if (options.json) {
            console.log(JSON.stringify(detailedKey, null, 2));
            return;
          }

          // Display API key information
          console.log(chalk.cyan('\n🔑 API Key Information\n'));

          const status = detailedKey.revoked
            ? chalk.red('Revoked')
            : detailedKey.expires_at && new Date(detailedKey.expires_at) < new Date()
              ? chalk.yellow('Expired')
              : chalk.green('Active');

          console.log(`  Name: ${chalk.white.bold(detailedKey.name)}`);
          console.log(`  Prefix: ${chalk.dim(detailedKey.key_prefix)}`);
          console.log(`  ID: ${chalk.dim(detailedKey.id)}`);
          console.log(`  Status: ${status}`);

          const envColor =
            detailedKey.environment === 'production'
              ? chalk.red
              : detailedKey.environment === 'staging'
                ? chalk.yellow
                : chalk.blue;
          console.log(`  Environment: ${envColor(detailedKey.environment)}`);

          console.log(
            `  Created: ${chalk.dim(new Date(detailedKey.created_at).toLocaleString())}`
          );

          if (detailedKey.last_used_at) {
            console.log(
              `  Last Used: ${chalk.dim(new Date(detailedKey.last_used_at).toLocaleString())}`
            );
          } else {
            console.log(`  Last Used: ${chalk.dim('Never')}`);
          }

          if (detailedKey.expires_at) {
            const expiryDate = new Date(detailedKey.expires_at);
            const isExpired = expiryDate < new Date();
            const expiryColor = isExpired ? chalk.red : chalk.yellow;
            console.log(`  Expires: ${expiryColor(expiryDate.toLocaleDateString())}`);

            if (!isExpired && !detailedKey.revoked) {
              const daysUntilExpiry = Math.ceil(
                (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              console.log(chalk.dim(`           (${daysUntilExpiry} days remaining)`));
            }
          } else {
            console.log(`  Expires: ${chalk.dim('Never')}`);
          }

          // Display permissions
          console.log(chalk.cyan('\n  Permissions:'));
          detailedKey.permissions.forEach((permission) => {
            console.log(chalk.green(`    ✓ ${permission}`));
          });

          // Display rate limit
          if (detailedKey.rate_limit_rpm) {
            console.log(chalk.cyan('\n  Rate Limit:'));
            console.log(`    ${chalk.white(detailedKey.rate_limit_rpm)} requests per minute`);
          }

          // Display allowed IPs
          if (detailedKey.allowed_ips && detailedKey.allowed_ips.length > 0) {
            console.log(chalk.cyan('\n  Allowed IP Addresses:'));
            detailedKey.allowed_ips.forEach((ip) => {
              console.log(chalk.dim(`    • ${ip}`));
            });
          }

          // Display allowed services
          if (detailedKey.allowed_services && detailedKey.allowed_services.length > 0) {
            console.log(chalk.cyan('\n  Allowed Services:'));
            detailedKey.allowed_services.forEach((service) => {
              console.log(chalk.dim(`    • ${service}`));
            });
          }

          // Show warnings for revoked or expired keys
          if (detailedKey.revoked) {
            console.log(
              chalk.red.bold(
                '\n  ⚠️  This API key is revoked and cannot be used for authentication.'
              )
            );
          } else if (
            detailedKey.expires_at &&
            new Date(detailedKey.expires_at) < new Date()
          ) {
            console.log(
              chalk.yellow.bold(
                '\n  ⚠️  This API key has expired and cannot be used for authentication.'
              )
            );
            console.log(
              chalk.dim('     Create a new key with: nexus api-key create')
            );
          }

          console.log();
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to fetch API key information'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
            process.exit(1);
          } else if (error.code === 'APIKEY_NOT_FOUND') {
            console.error(chalk.red('\n✗ API key not found.\n'));
            process.exit(1);
          } else if (error.code === 'PERMISSION_DENIED') {
            console.error(
              chalk.red('\n✗ You do not have permission to view this API key.\n')
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
