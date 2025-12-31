/**
 * Login Command - Claude Code style authentication
 *
 * Opens browser for dashboard authentication, user pastes CLI token
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { AuthCredentials } from '../../types/index.js';

const DASHBOARD_URL = 'https://dashboard.adverant.ai';

/**
 * Decode JWT payload without verification (for extracting user info)
 * The token was already validated by the dashboard's OAuth flow
 */
function decodeJwtPayload(token: string): { sub?: string; email?: string; name?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payloadPart = parts[1];
    if (!payloadPart) {
      return null;
    }
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function createLoginCommand(
  _authClient: unknown, // Keep signature for compatibility but not used
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('login');

  command
    .description('Login to Nexus platform')
    .action(async () => {
      try {
        // Check if already logged in
        const isAuthenticated = await credentialsManager.isAuthenticated();
        if (isAuthenticated) {
          const { shouldContinue } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldContinue',
              message: 'You are already logged in. Login again?',
              default: false,
            },
          ]);

          if (!shouldContinue) {
            console.log(chalk.yellow('Login cancelled.'));
            return;
          }

          await credentialsManager.clearCredentials();
        }

        // Generate device code for URL tracking
        const deviceCode = generateDeviceCode();
        const authUrl = `${DASHBOARD_URL}/cli-auth?code=${deviceCode}`;

        console.log(chalk.cyan('\nOpening Nexus authentication page...\n'));
        console.log(chalk.dim(`  ${authUrl}\n`));

        try {
          await open(authUrl);
          console.log(chalk.green('Browser opened!\n'));
        } catch {
          console.log(chalk.yellow('Could not open browser automatically.'));
          console.log(`Please visit: ${chalk.cyan(authUrl)}\n`);
        }

        console.log(chalk.yellow('After logging in on the dashboard:\n'));
        console.log('  1. Authenticate with Google or GitHub');
        console.log('  2. Copy the CLI token displayed');
        console.log('  3. Paste it below\n');

        // Prompt for token
        const { token } = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Paste your CLI token:',
            mask: '*',
            validate: (input: string) => {
              if (!input || input.length < 10) {
                return 'Please paste a valid CLI token';
              }
              return true;
            },
          },
        ]);

        // Validate token by decoding JWT
        const spinner = ora('Verifying token...').start();

        const payload = decodeJwtPayload(token);

        if (!payload) {
          spinner.fail(chalk.red('Invalid token format'));
          console.error(chalk.red('\nThe token is not a valid JWT.'));
          console.log(chalk.yellow('Please copy the complete token from the dashboard.\n'));
          process.exit(1);
        }

        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          spinner.fail(chalk.red('Token expired'));
          console.error(chalk.red('\nThe token has expired.'));
          console.log(chalk.yellow('Please get a fresh token from the dashboard.\n'));
          process.exit(1);
        }

        // Extract user info from JWT
        const email = payload.email || 'unknown@user.com';
        const userId = payload.sub || payload.email || 'unknown';

        spinner.succeed(chalk.green('Authenticated!'));

        // Calculate expiry from JWT or default to 30 days
        const expiresAt = payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Save credentials
        const credentials: AuthCredentials = {
          access_token: token,
          refresh_token: '',
          expires_at: expiresAt,
          token_type: 'Bearer',
          user_id: userId,
          email: email,
        };

        await credentialsManager.saveCredentials(credentials);

        console.log(chalk.cyan('\nLogged in as:'), chalk.white(email));
        console.log(chalk.dim(`Credentials stored at: ${credentialsManager.getCredentialsPath()}\n`));
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Generate a human-readable device code for URL tracking
 */
function generateDeviceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars (0, O, 1, I)
  let code = '';

  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}
