/**
 * WhoAmI Command
 *
 * Display current authentication context (user, org, app, permissions)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';

/**
 * Format date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
}

/**
 * Format permissions list
 */
function formatPermissions(permissions: string[]): string {
  if (!permissions || permissions.length === 0) {
    return chalk.dim('None');
  }

  return permissions
    .map((p) => chalk.green(p))
    .join(', ');
}

/**
 * Get subscription tier display with color
 */
function formatSubscriptionTier(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'free':
      return chalk.gray(tier);
    case 'pro':
      return chalk.blue(tier);
    case 'enterprise':
      return chalk.magenta(tier);
    default:
      return chalk.white(tier);
  }
}

/**
 * Get status display with color
 */
function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return chalk.green(status);
    case 'suspended':
      return chalk.red(status);
    case 'deactivated':
    case 'cancelled':
      return chalk.yellow(status);
    default:
      return chalk.white(status);
  }
}

export function createWhoAmICommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('whoami');

  command
    .description('Show current authentication context')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Check if authenticated
        const isAuthenticated = await credentialsManager.isAuthenticated();
        if (!isAuthenticated) {
          console.log(chalk.yellow('\nYou are not currently logged in.\n'));
          console.log(chalk.cyan('🔑 To get started:\n'));
          console.log(`  Run ${chalk.green('nexus login')} to authenticate\n`);
          console.log(`  Run ${chalk.green('nexus register')} to create a new account\n`);
          return;
        }

        // Load credentials
        const credentials = await credentialsManager.loadCredentials();
        if (!credentials) {
          console.log(chalk.red('\nError: Could not load credentials\n'));
          process.exit(1);
        }

        // Set token for authenticated requests
        authClient.setAccessToken(credentials.access_token);

        const spinner = ora('Fetching account information...').start();

        try {
          // Get whoami info from server
          const whoami = await authClient.whoami();

          spinner.succeed(chalk.green('Account information retrieved'));

          // JSON output
          if (options.json) {
            console.log(JSON.stringify(whoami, null, 2));
            return;
          }

          // Formatted output
          console.log(chalk.cyan('\n👤 User Information:\n'));
          console.log(`  ${chalk.bold('Name:')}           ${chalk.white(whoami.user.name)}`);
          console.log(`  ${chalk.bold('Email:')}          ${chalk.white(whoami.user.email)}`);
          console.log(`  ${chalk.bold('User ID:')}        ${chalk.dim(whoami.user.id)}`);
          console.log(`  ${chalk.bold('Subscription:')}   ${formatSubscriptionTier(whoami.user.subscription_tier)}`);
          console.log(`  ${chalk.bold('Status:')}         ${formatStatus(whoami.user.status)}`);
          console.log(`  ${chalk.bold('Created:')}        ${chalk.dim(formatDate(whoami.user.created_at))}`);

          // Organization info
          if (whoami.organization) {
            console.log(chalk.cyan('\n🏢 Current Organization:\n'));
            console.log(`  ${chalk.bold('Name:')}           ${chalk.white(whoami.organization.name)}`);
            console.log(`  ${chalk.bold('Slug:')}           ${chalk.white(whoami.organization.slug)}`);
            console.log(`  ${chalk.bold('Organization ID:')} ${chalk.dim(whoami.organization.id)}`);
            console.log(`  ${chalk.bold('Subscription:')}   ${formatSubscriptionTier(whoami.organization.subscription_tier)}`);
            console.log(`  ${chalk.bold('Status:')}         ${formatStatus(whoami.organization.status)}`);
            console.log(`  ${chalk.bold('Created:')}        ${chalk.dim(formatDate(whoami.organization.created_at))}`);

            if (whoami.role) {
              console.log(`  ${chalk.bold('Your Role:')}      ${chalk.green(whoami.role)}`);
            }

            // Organization features
            if (whoami.organization.features && whoami.organization.features.length > 0) {
              console.log(chalk.cyan('\n  ✨ Features:\n'));
              whoami.organization.features.forEach((feature) => {
                console.log(`    • ${chalk.white(feature)}`);
              });
            }
          } else {
            console.log(chalk.yellow('\n⚠ No organization set'));
            console.log(chalk.dim('  Run ') + chalk.green('nexus org list') + chalk.dim(' to see available organizations'));
          }

          // App info
          if (whoami.app) {
            console.log(chalk.cyan('\n📱 Current App:\n'));
            console.log(`  ${chalk.bold('Name:')}           ${chalk.white(whoami.app.name)}`);
            console.log(`  ${chalk.bold('Slug:')}           ${chalk.white(whoami.app.slug)}`);
            console.log(`  ${chalk.bold('App ID:')}         ${chalk.dim(whoami.app.id)}`);
            console.log(`  ${chalk.bold('Status:')}         ${formatStatus(whoami.app.status)}`);

            if (whoami.app.description) {
              console.log(`  ${chalk.bold('Description:')}    ${chalk.dim(whoami.app.description)}`);
            }

            // Token quota info
            if (whoami.app.monthly_token_quota) {
              const quotaUsed = whoami.app.tokens_used_this_month;
              const quotaTotal = whoami.app.monthly_token_quota;
              const quotaPercent = Math.round((quotaUsed / quotaTotal) * 100);

              let quotaColor = chalk.green;
              if (quotaPercent > 80) {
                quotaColor = chalk.red;
              } else if (quotaPercent > 60) {
                quotaColor = chalk.yellow;
              }

              console.log(`  ${chalk.bold('Token Usage:')}    ${quotaColor(`${quotaUsed.toLocaleString()} / ${quotaTotal.toLocaleString()}`)} ${chalk.dim(`(${quotaPercent}%)`)}`);
            }

            console.log(`  ${chalk.bold('Created:')}        ${chalk.dim(formatDate(whoami.app.created_at))}`);
          } else {
            console.log(chalk.yellow('\n⚠ No app set'));
            console.log(chalk.dim('  Run ') + chalk.green('nexus app list') + chalk.dim(' to see available apps'));
          }

          // API Key info (if using API key authentication)
          if (whoami.api_key) {
            console.log(chalk.cyan('\n🔑 API Key Authentication:\n'));
            console.log(`  ${chalk.bold('Name:')}           ${chalk.white(whoami.api_key.name)}`);
            console.log(`  ${chalk.bold('Key Prefix:')}     ${chalk.dim(whoami.api_key.key_prefix)}`);
            console.log(`  ${chalk.bold('Environment:')}    ${chalk.white(whoami.api_key.environment)}`);
            console.log(`  ${chalk.bold('Key ID:')}         ${chalk.dim(whoami.api_key.id)}`);
          }

          // Permissions
          console.log(chalk.cyan('\n🔐 Permissions:\n'));
          if (whoami.permissions && whoami.permissions.length > 0) {
            // Group permissions by category
            const permissionsByCategory: Record<string, string[]> = {};

            whoami.permissions.forEach((permission) => {
              const category = permission.split(':')[0] || 'other';
              if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
              }
              permissionsByCategory[category].push(permission);
            });

            // Display permissions by category
            Object.entries(permissionsByCategory).forEach(([category, perms]) => {
              console.log(`  ${chalk.bold(category.toUpperCase())}:`);
              perms.forEach((perm) => {
                console.log(`    • ${chalk.green(perm)}`);
              });
            });
          } else {
            console.log(`  ${chalk.dim('No permissions assigned')}`);
          }

          // Session info
          console.log(chalk.cyan('\n🔐 Session Info:\n'));
          console.log(`  ${chalk.bold('Token Type:')}     ${chalk.white(credentials.token_type)}`);
          console.log(`  ${chalk.bold('Expires At:')}     ${chalk.dim(formatDate(credentials.expires_at))}`);

          // Check if token is expiring soon
          const expiresAt = new Date(credentials.expires_at);
          const now = new Date();
          const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntilExpiry < 24) {
            console.log(chalk.yellow(`\n  ⚠ Your session expires in ${Math.round(hoursUntilExpiry)} hours`));
            console.log(chalk.dim(`    Run ${chalk.white('nexus login')} to refresh your session\n`));
          }

          console.log(chalk.dim(`\n  Credentials: ${credentialsManager.getCredentialsPath()}\n`));
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to retrieve account information'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Your session has expired\n'));
            console.error(chalk.yellow(`  Run ${chalk.white('nexus login')} to authenticate again\n`));
          } else if (error.code === 'AUTH_TOKEN_INVALID') {
            console.error(chalk.red('\n✗ Invalid authentication token\n'));
            console.error(chalk.yellow(`  Run ${chalk.white('nexus login')} to authenticate again\n`));
          } else if (error.code === 'APIKEY_INVALID' || error.code === 'APIKEY_REVOKED') {
            console.error(chalk.red('\n✗ API key is invalid or has been revoked\n'));
            console.error(chalk.yellow(`  Please create a new API key or login with credentials\n`));
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
