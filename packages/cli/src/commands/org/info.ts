/**
 * Organization Info Command
 *
 * Display detailed information about an organization
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { Organization, WhoAmIResponse } from '@adverant/nexus-cli-types';

export function createOrganizationInfoCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('info');

  command
    .description('Show detailed organization information')
    .argument('[slug]', 'Organization slug (defaults to current organization)')
    .option('-j, --json', 'Output as JSON')
    .action(async (slug?: string, options?: any) => {
      try {
        const spinner = ora('Fetching organization information...').start();

        try {
          let organization: Organization;

          if (slug) {
            // Find organization by slug
            const organizations = await authClient.listOrganizations();
            const org = organizations.find((o) => o.slug === slug);

            if (!org) {
              spinner.fail(chalk.red(`Organization '${slug}' not found`));
              console.error(chalk.red(`\n✗ Organization with slug '${slug}' not found.\n`));
              process.exit(1);
            }

            organization = await authClient.getOrganization(org.id);
          } else {
            // Use current organization
            const currentOrgId = await credentialsManager.getCurrentOrganizationId();

            if (!currentOrgId) {
              spinner.fail(chalk.red('No current organization'));
              console.error(chalk.red('\n✗ No organization selected.\n'));
              console.error(chalk.yellow('  Set an organization with: nexus org switch\n'));
              process.exit(1);
            }

            organization = await authClient.getOrganization(currentOrgId);
          }

          // Get additional context (role, permissions)
          let whoami: WhoAmIResponse | null = null;
          try {
            whoami = await authClient.whoami();
          } catch {
            // Non-critical - permissions info might not be available
          }

          spinner.stop();

          if (options?.json) {
            console.log(
              JSON.stringify(
                {
                  organization,
                  role: whoami?.role,
                  permissions: whoami?.permissions,
                },
                null,
                2
              )
            );
            return;
          }

          // Display organization information
          console.log(chalk.cyan('\n🏢 Organization Information\n'));
          console.log(`  Name: ${chalk.white.bold(organization.name)}`);
          console.log(`  Slug: ${chalk.white(organization.slug)}`);
          console.log(`  ID: ${chalk.dim(organization.id)}`);

          const statusColor =
            organization.status === 'active'
              ? chalk.green
              : organization.status === 'suspended'
                ? chalk.red
                : chalk.yellow;
          console.log(`  Status: ${statusColor(organization.status)}`);

          console.log(`  Subscription: ${chalk.white(organization.subscription_tier)}`);
          console.log(
            `  Created: ${chalk.dim(new Date(organization.created_at).toLocaleString())}`
          );

          // Display role if available
          if (whoami?.role) {
            console.log(`  Your Role: ${chalk.white(whoami.role)}`);
          }

          // Display features
          if (organization.features && organization.features.length > 0) {
            console.log(chalk.cyan('\n  Features:'));
            organization.features.forEach((feature) => {
              console.log(chalk.green(`    ✓ ${feature}`));
            });
          }

          // Display permissions if available
          if (whoami?.permissions && whoami.permissions.length > 0) {
            console.log(chalk.cyan('\n  Your Permissions:'));
            whoami.permissions.forEach((permission) => {
              console.log(chalk.dim(`    • ${permission}`));
            });
          }

          // Display settings if available (non-sensitive only)
          if (organization.settings && Object.keys(organization.settings).length > 0) {
            const settingsToShow = Object.entries(organization.settings).filter(
              ([key]) => !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('key')
            );

            if (settingsToShow.length > 0) {
              console.log(chalk.cyan('\n  Settings:'));
              settingsToShow.forEach(([key, value]) => {
                console.log(chalk.dim(`    ${key}: ${JSON.stringify(value)}`));
              });
            }
          }

          console.log();
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to fetch organization information'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
            process.exit(1);
          } else if (error.code === 'ORG_NOT_FOUND') {
            console.error(chalk.red('\n✗ Organization not found.\n'));
            process.exit(1);
          } else if (error.code === 'PERMISSION_DENIED') {
            console.error(
              chalk.red('\n✗ You do not have permission to view this organization.\n')
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
