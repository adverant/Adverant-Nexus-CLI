/**
 * Logout Command
 *
 * Logout from Nexus platform (clear stored credentials)
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';

export function createLogoutCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('logout');

  command
    .description('Logout from Nexus platform')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        // Check if logged in
        const isAuthenticated = await credentialsManager.isAuthenticated();
        if (!isAuthenticated) {
          console.log(chalk.yellow('\nYou are not currently logged in.\n'));
          return;
        }

        // Get current credentials to show user info
        const credentials = await credentialsManager.loadCredentials();
        if (credentials) {
          console.log(chalk.cyan('\n🔐 Current Session:\n'));
          console.log(`  Email: ${chalk.white(credentials.email)}`);
          console.log(`  User ID: ${chalk.dim(credentials.user_id)}`);
        }

        // Confirmation prompt (unless --force is used)
        if (!options.force) {
          const { confirmLogout } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmLogout',
              message: 'Are you sure you want to logout?',
              default: false,
            },
          ]);

          if (!confirmLogout) {
            console.log(chalk.yellow('\nLogout cancelled.\n'));
            return;
          }
        }

        const spinner = ora('Logging out...').start();

        try {
          // Attempt to revoke tokens on server (best effort)
          if (credentials) {
            authClient.setAccessToken(credentials.access_token);
            try {
              await authClient.logout();
            } catch (error) {
              // Server-side logout failed, but continue with local cleanup
              // This is non-critical as we're clearing credentials anyway
            }
          }

          // Clear local credentials
          await credentialsManager.clearCredentials();

          // Clear auth client token
          authClient.clearAccessToken();

          spinner.succeed(chalk.green('Logged out successfully'));

          console.log(chalk.green('\n✓ You have been logged out from Nexus CLI\n'));
          console.log(chalk.dim(`  Credentials cleared from: ${credentialsManager.getCredentialsPath()}\n`));

          // Show next steps
          console.log(chalk.cyan('🔑 To login again:\n'));
          console.log(`  Run ${chalk.green('nexus login')} to authenticate\n`);
          console.log(`  Run ${chalk.green('nexus register')} to create a new account\n`);
        } catch (error: any) {
          spinner.fail(chalk.red('Logout failed'));

          // Even if server-side logout fails, we should clear local credentials
          await credentialsManager.clearCredentials();
          authClient.clearAccessToken();

          console.log(chalk.yellow('\n⚠ Cleared local credentials, but server logout may have failed\n'));
          console.log(chalk.dim(`  Credentials cleared from: ${credentialsManager.getCredentialsPath()}\n`));

          if (error.message) {
            console.log(chalk.dim(`  Error: ${error.message}\n`));
          }
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}
