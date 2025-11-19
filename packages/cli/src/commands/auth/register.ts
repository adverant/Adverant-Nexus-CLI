/**
 * Register Command
 *
 * Interactive user registration for Nexus platform
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { AuthCredentials } from '@nexus-cli/types';

/**
 * Password strength validator
 */
function validatePasswordStrength(password: string): string | true {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const strengthScore = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (strengthScore < 3) {
    return 'Password must contain at least 3 of: uppercase, lowercase, numbers, special characters';
  }

  return true;
}

/**
 * Email format validator
 */
function validateEmail(email: string): string | true {
  if (!email || email.length === 0) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  if (email.length > 255) {
    return 'Email must be less than 255 characters';
  }

  return true;
}

/**
 * Name validator
 */
function validateName(name: string): string | true {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }

  if (name.length < 2) {
    return 'Name must be at least 2 characters';
  }

  if (name.length > 100) {
    return 'Name must be less than 100 characters';
  }

  return true;
}

/**
 * Organization name validator
 */
function validateOrganizationName(name: string): string | true {
  if (!name || name.trim().length === 0) {
    return true; // Optional field
  }

  if (name.length < 2) {
    return 'Organization name must be at least 2 characters';
  }

  if (name.length > 100) {
    return 'Organization name must be less than 100 characters';
  }

  return true;
}

export function createRegisterCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('register');

  command
    .description('Register a new Nexus account')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password (not recommended for security)')
    .option('-n, --name <name>', 'Full name')
    .option('-o, --organization <name>', 'Organization name (optional)')
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
              message: 'You are already logged in. Do you want to register a new account?',
              default: false,
            },
          ]);

          if (!shouldContinue) {
            console.log(chalk.yellow('Registration cancelled.'));
            return;
          }

          await credentialsManager.clearCredentials();
        }

        console.log(chalk.cyan('\n🎯 Create Your Nexus Account\n'));

        // Get registration details interactively
        let email = options.email;
        let password = options.password;
        let name = options.name;
        let organizationName = options.organization;

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            default: email,
            when: () => !email,
            validate: validateEmail,
          },
          {
            type: 'input',
            name: 'name',
            message: 'Full Name:',
            default: name,
            when: () => !name,
            validate: validateName,
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            when: () => !password,
            validate: validatePasswordStrength,
          },
          {
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm Password:',
            mask: '*',
            when: () => !password,
            validate: (input: string, answers: any) => {
              if (input !== answers.password) {
                return 'Passwords do not match';
              }
              return true;
            },
          },
          {
            type: 'input',
            name: 'organizationName',
            message: 'Organization Name (optional):',
            default: organizationName,
            when: () => !organizationName,
            validate: validateOrganizationName,
          },
        ]);

        email = email || answers.email;
        password = password || answers.password;
        name = name || answers.name;
        organizationName = organizationName || answers.organizationName;

        // Show registration summary
        console.log(chalk.cyan('\n📋 Registration Summary:\n'));
        console.log(`  Email: ${chalk.white(email)}`);
        console.log(`  Name: ${chalk.white(name)}`);
        if (organizationName && organizationName.trim()) {
          console.log(`  Organization: ${chalk.white(organizationName)}`);
        }

        const { confirmRegistration } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmRegistration',
            message: 'Proceed with registration?',
            default: true,
          },
        ]);

        if (!confirmRegistration) {
          console.log(chalk.yellow('\nRegistration cancelled.'));
          return;
        }

        // Attempt registration
        const spinner = ora('Creating your account...').start();

        try {
          const response = await authClient.register({
            email,
            password,
            name,
            organization_name: organizationName && organizationName.trim() ? organizationName : undefined,
          });

          spinner.succeed(chalk.green('Account created successfully!'));

          // Save credentials (auto-login after registration)
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

          // Show success message
          console.log(chalk.green('\n✓ Welcome to Nexus!\n'));
          console.log(chalk.cyan('👤 Your Account:\n'));
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

              // Set the organization if one was created
              if (orgs.length === 1) {
                await credentialsManager.setCurrentOrganization(orgs[0].id);
                console.log(chalk.green(`\n✓ Set ${orgs[0].name} as default organization`));
              } else if (orgs.length > 1) {
                // If multiple orgs (edge case), ask which to use
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

                await credentialsManager.setCurrentOrganization(orgs[orgIndex].id);
                console.log(chalk.green(`\n✓ Set ${orgs[orgIndex].name} as default organization`));
              }
            }
          } catch (error) {
            // Non-critical error
            console.log(chalk.yellow('\nWarning: Could not fetch organizations'));
          }

          console.log(chalk.green('\n✓ You are now logged in and ready to use Nexus CLI!\n'));
          console.log(chalk.dim(`  Credentials stored at: ${credentialsManager.getCredentialsPath()}\n`));

          // Show next steps
          console.log(chalk.cyan('🚀 Next Steps:\n'));
          console.log(`  ${chalk.white('1.')} Run ${chalk.green('nexus whoami')} to view your account info`);
          console.log(`  ${chalk.white('2.')} Run ${chalk.green('nexus app create')} to create your first app`);
          console.log(`  ${chalk.white('3.')} Run ${chalk.green('nexus --help')} to see all available commands\n`);
        } catch (error: any) {
          spinner.fail(chalk.red('Registration failed'));

          if (error.code === 'AUTH_EMAIL_ALREADY_EXISTS') {
            console.error(chalk.red('\n✗ An account with this email already exists\n'));
            console.error(chalk.yellow(`  Try logging in with: ${chalk.white('nexus login')}\n`));
          } else if (error.code === 'AUTH_INVALID_EMAIL') {
            console.error(chalk.red('\n✗ Invalid email format\n'));
          } else if (error.code === 'AUTH_WEAK_PASSWORD') {
            console.error(chalk.red('\n✗ Password does not meet security requirements\n'));
            console.error(chalk.yellow('  Password must contain at least 3 of: uppercase, lowercase, numbers, special characters\n'));
          } else if (error.code === 'AUTH_INVALID_NAME') {
            console.error(chalk.red('\n✗ Invalid name format\n'));
          } else if (error.code === 'ORGANIZATION_NAME_TAKEN') {
            console.error(chalk.red('\n✗ Organization name is already taken\n'));
            console.error(chalk.yellow('  Please choose a different organization name\n'));
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
