/**
 * Create Organization Command
 *
 * Create a new organization with interactive prompts
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';

/**
 * Validate slug format (lowercase, hyphens only, alphanumeric)
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Generate slug from organization name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createCreateOrganizationCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('create');

  command
    .description('Create a new organization')
    .option('-n, --name <name>', 'Organization name')
    .option('-s, --slug <slug>', 'Organization slug (URL-friendly identifier)')
    .option('--no-default', 'Do not set as default organization')
    .action(async (options) => {
      try {
        console.log(chalk.cyan('\n🏢 Create New Organization\n'));

        // Get organization name
        let name = options.name;
        if (!name) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Organization name:',
              validate: (input: string) => {
                if (!input || input.trim().length < 2) {
                  return 'Organization name must be at least 2 characters';
                }
                if (input.length > 100) {
                  return 'Organization name must be less than 100 characters';
                }
                return true;
              },
            },
          ]);
          name = answers.name;
        }

        // Auto-generate slug or get from user
        let slug = options.slug;
        if (!slug) {
          const autoSlug = generateSlug(name);
          const { slugChoice } = await inquirer.prompt([
            {
              type: 'input',
              name: 'slugChoice',
              message: 'Organization slug (URL-friendly):',
              default: autoSlug,
              validate: (input: string) => {
                if (!input || input.trim().length < 2) {
                  return 'Slug must be at least 2 characters';
                }
                if (!isValidSlug(input)) {
                  return 'Slug must contain only lowercase letters, numbers, and hyphens';
                }
                if (input.length > 50) {
                  return 'Slug must be less than 50 characters';
                }
                return true;
              },
            },
          ]);
          slug = slugChoice;
        }

        // Validate provided slug
        if (!isValidSlug(slug)) {
          console.error(
            chalk.red(
              '\n✗ Invalid slug format. Use only lowercase letters, numbers, and hyphens.\n'
            )
          );
          process.exit(1);
        }

        // Create organization
        const spinner = ora('Creating organization...').start();

        try {
          const organization = await authClient.createOrganization(name, slug);

          spinner.succeed(chalk.green('Organization created successfully!'));

          // Display organization details
          console.log(chalk.cyan('\n📋 Organization Details:\n'));
          console.log(`  Name: ${chalk.white(organization.name)}`);
          console.log(`  Slug: ${chalk.white(organization.slug)}`);
          console.log(`  ID: ${chalk.dim(organization.id)}`);
          console.log(`  Tier: ${chalk.white(organization.subscription_tier)}`);
          console.log(
            `  Status: ${chalk.green(organization.status)}`
          );
          console.log(
            `  Created: ${chalk.dim(new Date(organization.created_at).toLocaleString())}`
          );

          // Set as default organization if not disabled
          if (options.default !== false) {
            await credentialsManager.setCurrentOrganization(organization.id);
            console.log(
              chalk.green(
                `\n✓ ${organization.name} set as default organization`
              )
            );
          }

          console.log(
            chalk.dim(
              '\n  You can switch between organizations with: nexus org switch\n'
            )
          );
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to create organization'));

          if (error.code === 'ORG_SLUG_EXISTS') {
            console.error(
              chalk.red(
                `\n✗ An organization with slug '${slug}' already exists.\n`
              )
            );
            console.error(chalk.yellow('  Please choose a different slug.\n'));
          } else if (error.code === 'ORG_LIMIT_REACHED') {
            console.error(
              chalk.red('\n✗ You have reached the maximum number of organizations.\n')
            );
            console.error(
              chalk.yellow('  Please upgrade your plan or contact support.\n')
            );
          } else if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
          } else {
            console.error(chalk.red(`\n✗ ${error.message}\n`));
          }

          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
