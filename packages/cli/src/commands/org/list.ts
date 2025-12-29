/**
 * List Organizations Command
 *
 * Display all organizations the user belongs to
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { Organization } from '../../types/index.js';

export function createListOrganizationsCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('list');

  command
    .description('List all organizations you belong to')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const spinner = ora('Fetching organizations...').start();

        try {
          // Get current organization
          const currentOrgId = await credentialsManager.getCurrentOrganizationId();

          // Fetch organizations
          const organizations = await authClient.listOrganizations();

          spinner.stop();

          if (organizations.length === 0) {
            console.log(chalk.yellow('\nYou are not a member of any organizations.'));
            console.log(chalk.dim('Create one with: nexus org create\n'));
            return;
          }

          if (options.json) {
            console.log(JSON.stringify({ organizations, current: currentOrgId }, null, 2));
            return;
          }

          // Display as table
          console.log(chalk.cyan('\n📋 Your Organizations:\n'));

          const table = new Table({
            head: [
              chalk.white.bold('Name'),
              chalk.white.bold('Slug'),
              chalk.white.bold('Tier'),
              chalk.white.bold('Status'),
              chalk.white.bold('Created'),
            ],
            style: {
              head: [],
              border: ['dim'],
            },
            colWidths: [25, 20, 15, 12, 20],
          });

          organizations.forEach((org: Organization) => {
            const isCurrent = org.id === currentOrgId;
            const name = isCurrent
              ? chalk.green.bold(`${org.name} ★`)
              : chalk.white(org.name);

            const status =
              org.status === 'active'
                ? chalk.green('Active')
                : org.status === 'suspended'
                  ? chalk.red('Suspended')
                  : chalk.yellow('Cancelled');

            const createdDate = new Date(org.created_at).toLocaleDateString();

            table.push([
              name,
              chalk.dim(org.slug),
              org.subscription_tier,
              status,
              chalk.dim(createdDate),
            ]);
          });

          console.log(table.toString());
          console.log(chalk.dim('\n  ★ = Current default organization\n'));

          // Show features if available
          const currentOrg = organizations.find((org) => org.id === currentOrgId);
          if (currentOrg?.features && currentOrg.features.length > 0) {
            console.log(chalk.cyan('Current Organization Features:'));
            currentOrg.features.forEach((feature) => {
              console.log(chalk.dim(`  • ${feature}`));
            });
            console.log();
          }
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to fetch organizations'));

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
