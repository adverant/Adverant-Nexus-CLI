/**
 * Rotate API Key Command
 *
 * Create a new API key with the same permissions and optionally revoke the old one
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { APIKey, CreateAPIKeyRequest } from '@nexus-cli/types';

export function createRotateAPIKeyCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('rotate');

  command
    .description('Rotate an API key (create new with same permissions)')
    .argument('<key-id-or-prefix>', 'API key ID or prefix to rotate')
    .option('--keep-old', 'Keep old key active (grace period)')
    .option('--grace-period <days>', 'Days to keep old key active', '7')
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
          let oldKey: APIKey | undefined;

          // First try exact ID match
          oldKey = apiKeys.find((k) => k.id === keyIdOrPrefix);

          // If not found, try prefix match
          if (!oldKey) {
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

            oldKey = prefixMatches[0];
          }

          // Get detailed info
          const oldKeyDetails = await authClient.getAPIKey(oldKey.id);

          spinner.stop();

          // Check if key is already revoked
          if (oldKeyDetails.revoked) {
            console.error(
              chalk.red(
                `\n✗ Cannot rotate revoked API key '${oldKeyDetails.name}'.\n`
              )
            );
            console.error(chalk.yellow('  Create a new key instead: nexus api-key create\n'));
            process.exit(1);
          }

          // Display current key details
          console.log(chalk.cyan('\n🔄 Rotate API Key\n'));
          console.log(chalk.dim('Current Key:'));
          console.log(`  Name: ${chalk.white(oldKeyDetails.name)}`);
          console.log(`  Prefix: ${chalk.dim(oldKeyDetails.key_prefix)}`);
          console.log(`  Environment: ${chalk.white(oldKeyDetails.environment)}`);
          console.log(`  Permissions: ${chalk.dim(oldKeyDetails.permissions.join(', '))}`);

          // Confirmation
          if (!options.force) {
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: 'Create new API key with same permissions?',
                default: true,
              },
            ]);

            if (!confirm) {
              console.log(chalk.yellow('\nRotation cancelled.\n'));
              return;
            }
          }

          // Prepare new key request with same settings
          const newKeyRequest: CreateAPIKeyRequest = {
            name: `${oldKeyDetails.name} (rotated)`,
            environment: oldKeyDetails.environment,
            permissions: oldKeyDetails.permissions,
            organization_id: currentOrgId,
            rate_limit_rpm: oldKeyDetails.rate_limit_rpm,
            allowed_ips: oldKeyDetails.allowed_ips,
            allowed_services: oldKeyDetails.allowed_services,
          };

          // Set expiry for new key if old key had one
          if (oldKeyDetails.expires_at) {
            newKeyRequest.expires_at = oldKeyDetails.expires_at;
          }

          // Create new API key
          const createSpinner = ora('Creating new API key...').start();

          try {
            const newKey = await authClient.createAPIKey(newKeyRequest);

            createSpinner.succeed(chalk.green('New API key created successfully!'));

            // Display the new key prominently
            console.log(chalk.cyan('\n🔐 New API Key\n'));
            console.log(chalk.red.bold('⚠️  SAVE THIS KEY NOW - IT WILL NOT BE SHOWN AGAIN!\n'));

            console.log(chalk.yellow.bold('━'.repeat(80)));
            console.log(chalk.white.bold(`  ${newKey.key}`));
            console.log(chalk.yellow.bold('━'.repeat(80)));

            console.log(chalk.dim('\n  New Key Details:\n'));
            console.log(`  Name: ${chalk.white(newKey.name)}`);
            console.log(`  Prefix: ${chalk.dim(newKey.key_prefix)}`);
            console.log(`  Environment: ${chalk.white(newKey.environment)}`);

            // Save new key reference
            await credentialsManager.saveAPIKeyReference({
              id: newKey.id,
              key_prefix: newKey.key_prefix,
              name: newKey.name,
              environment: newKey.environment as any,
              permissions: newKey.permissions,
              organization_id: currentOrgId,
              rate_limit_rpm: newKeyRequest.rate_limit_rpm,
              allowed_ips: newKeyRequest.allowed_ips,
              allowed_services: newKeyRequest.allowed_services,
              expires_at: newKeyRequest.expires_at,
              revoked: false,
              created_at: newKey.created_at,
            });

            // Handle old key revocation
            if (options.keepOld) {
              const graceDays = parseInt(options.gracePeriod, 10) || 7;

              console.log(
                chalk.yellow(
                  `\n⏰ Old key will remain active for ${graceDays} days (grace period)`
                )
              );
              console.log(chalk.dim(`   Old key prefix: ${oldKeyDetails.key_prefix}`));
              console.log(
                chalk.dim(
                  `   Remember to revoke it after: ${new Date(
                    Date.now() + graceDays * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}`
                )
              );
              console.log(
                chalk.dim(`   Command: nexus api-key delete ${oldKeyDetails.key_prefix}`)
              );
            } else {
              // Revoke old key immediately
              const revokeSpinner = ora('Revoking old API key...').start();

              try {
                await authClient.revokeAPIKey(oldKeyDetails.id);
                await credentialsManager.removeAPIKeyReference(oldKeyDetails.id);

                revokeSpinner.succeed(chalk.green('Old API key revoked'));

                console.log(
                  chalk.dim(`\n  Old key (${oldKeyDetails.key_prefix}) has been revoked`)
                );
                console.log(
                  chalk.dim('  Update your applications to use the new key immediately')
                );
              } catch (revokeError: any) {
                revokeSpinner.fail(
                  chalk.yellow('Failed to revoke old key (new key created successfully)')
                );
                console.error(
                  chalk.yellow(
                    `\n⚠️  Warning: Could not automatically revoke old key: ${revokeError.message}`
                  )
                );
                console.error(
                  chalk.yellow(
                    `   Please manually revoke it: nexus api-key delete ${oldKeyDetails.id}`
                  )
                );
              }
            }

            console.log(chalk.red.bold('\n  ⚠️  ' + newKey.warning));
            console.log();
          } catch (createError: any) {
            createSpinner.fail(chalk.red('Failed to create new API key'));

            if (createError.code === 'APIKEY_LIMIT_REACHED') {
              console.error(
                chalk.red('\n✗ You have reached the maximum number of API keys.\n')
              );
              console.error(
                chalk.yellow('  Please delete unused keys or upgrade your plan.\n')
              );
            } else if (createError.code === 'PERMISSION_DENIED') {
              console.error(
                chalk.red('\n✗ You do not have permission to create API keys.\n')
              );
            } else {
              console.error(chalk.red(`\n✗ ${createError.message}\n`));
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
