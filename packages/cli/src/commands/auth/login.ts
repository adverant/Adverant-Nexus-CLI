/**
 * Login Command
 *
 * Interactive login to Nexus platform
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { AuthCredentials } from '../../types/index.js';

export function createLoginCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('login');

  command
    .description('Login to Nexus platform')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password (not recommended for security)')
    .option('--api-url <url>', 'Override Nexus API URL')
    .action(async (options) => {
      try {
        // Check if already logged in
        const isAuthenticated = await credentialsManager.isAuthenticated();
        if (isAuthenticated) {
          const { shouldContinue } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldContinue',
              message: 'You are already logged in. Do you want to login again?',
              default: false,
            },
          ]);

          if (!shouldContinue) {
            console.log(chalk.yellow('Login cancelled.'));
            return;
          }

          await credentialsManager.clearCredentials();
        }

        // Get credentials interactively if not provided
        let email = options.email;
        let password = options.password;

        if (!email || !password) {
          console.log(chalk.cyan('\n🔐 Nexus Login\n'));

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'email',
              message: 'Email:',
              default: email,
              validate: (input: string) => {
                if (!input || !input.includes('@')) {
                  return 'Please enter a valid email address';
                }
                return true;
              },
            },
            {
              type: 'password',
              name: 'password',
              message: 'Password:',
              mask: '*',
              validate: (input: string) => {
                if (!input || input.length < 8) {
                  return 'Password must be at least 8 characters';
                }
                return true;
              },
            },
          ]);

          email = email || answers.email;
          password = password || answers.password;
        }

        // Attempt login
        const spinner = ora('Authenticating...').start();

        try {
          const response = await authClient.login({
            email,
            password,
          });

          spinner.succeed(chalk.green('Login successful!'));

          // Save credentials
          const credentials: AuthCredentials = {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_at: response.expires_at,
            token_type: response.token_type,
            user_id: response.user_id,
            email: response.email,
          };

          await credentialsManager.saveCredentials(credentials);

          // Set token for future requests
          authClient.setAccessToken(response.access_token);

          // Get user info
          console.log(chalk.cyan('\n👤 User Information:\n'));
          console.log(`  Email: ${chalk.white(response.email)}`);
          console.log(`  User ID: ${chalk.dim(response.user_id)}`);

          // Get organization info
          try {
            const orgs = await authClient.listOrganizations();
            if (orgs.length > 0) {
              console.log(chalk.cyan('\n🏢 Organizations:\n'));
              orgs.forEach((org, index) => {
                console.log(`  ${index + 1}. ${chalk.white(org.name)} ${chalk.dim(`(${org.slug})`)}`);
              });

              // If multiple orgs, ask which to use
              if (orgs.length > 1) {
                const { orgIndex } = await inquirer.prompt([
                  {
                    type: 'list',
                    name: 'orgIndex',
                    message: 'Select default organization:',
                    choices: orgs.map((org, index) => ({
                      name: `${org.name} (${org.slug})`,
                      value: index,
                    })),
                  },
                ]);

                const selectedOrg = orgs[orgIndex];
                if (selectedOrg) {
                  await credentialsManager.setCurrentOrganization(selectedOrg.id);
                  console.log(chalk.green(`\n✓ Set ${selectedOrg.name} as default organization`));
                }
              } else {
                const firstOrg = orgs[0];
                if (firstOrg) {
                  await credentialsManager.setCurrentOrganization(firstOrg.id);
                }
              }
            }
          } catch (error) {
            // Non-critical error
            console.log(chalk.yellow('\nWarning: Could not fetch organizations'));
          }

          console.log(chalk.green('\n✓ You are now logged in and ready to use Nexus CLI!\n'));
          console.log(chalk.dim(`  Credentials stored at: ${credentialsManager.getCredentialsPath()}\n`));
        } catch (error: any) {
          spinner.fail(chalk.red('Login failed'));

          if (error.code === 'AUTH_INVALID_CREDENTIALS') {
            console.error(chalk.red('\n✗ Invalid email or password\n'));
          } else if (error.code === 'AUTH_ACCOUNT_LOCKED') {
            console.error(chalk.red('\n✗ Account is locked due to too many failed login attempts\n'));
            console.error(chalk.yellow('  Please wait 15 minutes or reset your password\n'));
          } else if (error.code === 'AUTH_ACCOUNT_SUSPENDED') {
            console.error(chalk.red('\n✗ Account is suspended\n'));
            console.error(chalk.yellow('  Please contact support@adverant.ai\n'));
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
