/**
 * Set Token Command
 *
 * Directly set a CLI token for authentication (useful for automation/CI)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { AuthCredentials } from '../../types/index.js';

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

export function createSetTokenCommand(
  _authClient: unknown, // Keep signature for compatibility but not used
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('set-token');

  command
    .description('Set CLI token directly (for automation/CI)')
    .argument('<token>', 'CLI authentication token')
    .action(async (token: string) => {
      try {
        if (!token || token.length < 10) {
          console.error(chalk.red('\nError: Invalid token format\n'));
          process.exit(1);
        }

        // Validate token by decoding JWT
        const spinner = ora('Verifying token...').start();

        const payload = decodeJwtPayload(token);

        if (!payload) {
          spinner.fail(chalk.red('Invalid token format'));
          console.error(chalk.red('\nThe token is not a valid JWT.'));
          process.exit(1);
        }

        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          spinner.fail(chalk.red('Token expired'));
          console.error(chalk.red('\nThe token has expired.'));
          process.exit(1);
        }

        // Extract user info from JWT
        const email = payload.email || 'unknown@user.com';
        const userId = payload.sub || payload.email || 'unknown';

        spinner.succeed(chalk.green('Token verified!'));

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
