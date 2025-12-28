/**
 * Switch Organization Command
 *
 * Switch the default organization context
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { Organization } from '@adverant-nexus/types';

export function createSwitchOrganizationCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('switch');

  command
    .description('Switch default organization')
    .argument('[slug]', 'Organization slug to switch to')
    .action(async (slug?: string) => {
      try {
        const spinner = ora('Fetching organizations...').start();

        try {
          const organizations = await authClient.listOrganizations();
          const currentOrgId = await credentialsManager.getCurrentOrganizationId();

          spinner.stop();

          if (organizations.length === 0) {
            console.log(chalk.yellow('\nYou are not a member of any organizations.'));
            console.log(chalk.dim('Create one with: nexus org create\n'));
            return;
          }

          if (organizations.length === 1) {
            console.log(
              chalk.yellow('\nYou only belong to one organization. Nothing to switch.\n')
            );
            return;
          }

          let selectedOrg: Organization;

          // If slug provided, find organization
          if (slug) {
            const org = organizations.find((o) => o.slug === slug);
            if (!org) {
              console.error(
                chalk.red(`\n✗ Organization with slug '${slug}' not found.\n`)
              );
              console.log(chalk.dim('Available organizations:'));
              organizations.forEach((o) => {
                console.log(chalk.dim(`  • ${o.slug} (${o.name})`));
              });
              console.log();
              process.exit(1);
            }

            if (org.id === currentOrgId) {
              console.log(
                chalk.yellow(`\n${org.name} is already your default organization.\n`)
              );
              return;
            }

            selectedOrg = org;
          } else {
            // Interactive selection
            console.log(chalk.cyan('\n🔄 Switch Organization\n'));

            const { orgIndex } = await inquirer.prompt([
              {
                type: 'list',
                name: 'orgIndex',
                message: 'Select organization:',
                choices: organizations.map((org, index) => {
                  const isCurrent = org.id === currentOrgId;
                  const label = isCurrent
                    ? `${org.name} (${org.slug}) ★ current`
                    : `${org.name} (${org.slug})`;

                  return {
                    name: label,
                    value: index,
                  };
                }),
              },
            ]);

            const org = organizations[orgIndex];
            if (!org) {
              throw new Error('Invalid organization selected');
            }
            selectedOrg = org;

            // Check if already current
            if (org.id === currentOrgId) {
              console.log(
                chalk.yellow(`\n${selectedOrg.name} is already your default organization.\n`)
              );
              return;
            }
          }

          // Confirm switch
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Switch to ${selectedOrg.name}?`,
              default: true,
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow('\nSwitch cancelled.\n'));
            return;
          }

          // Perform switch
          const switchSpinner = ora('Switching organization...').start();

          await credentialsManager.setCurrentOrganization(selectedOrg.id);

          switchSpinner.succeed(chalk.green('Organization switched successfully!'));

          console.log(chalk.cyan('\n📋 Current Organization:\n'));
          console.log(`  Name: ${chalk.white(selectedOrg.name)}`);
          console.log(`  Slug: ${chalk.white(selectedOrg.slug)}`);
          console.log(`  Tier: ${chalk.white(selectedOrg.subscription_tier)}`);

          if (selectedOrg.features && selectedOrg.features.length > 0) {
            console.log(chalk.cyan('\n  Features:'));
            selectedOrg.features.forEach((feature) => {
              console.log(chalk.dim(`    • ${feature}`));
            });
          }

          console.log(
            chalk.dim(
              '\n  All future commands will use this organization context.\n'
            )
          );
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
