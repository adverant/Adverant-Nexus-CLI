/**
 * Create API Key Command
 *
 * Create a new API key with interactive configuration
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AuthClient } from '../../auth/auth-client.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { CreateAPIKeyRequest } from '@nexus-cli/types';

const AVAILABLE_PERMISSIONS = [
  'graphrag:query',
  'graphrag:index',
  'mageagent:execute',
  'mageagent:query',
  'analytics:read',
  'analytics:write',
  'admin:read',
  'admin:write',
];

export function createCreateAPIKeyCommand(
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): Command {
  const command = new Command('create');

  command
    .description('Create a new API key')
    .option('-n, --name <name>', 'API key name')
    .option('-e, --env <environment>', 'Environment (production|staging|development)')
    .option('-p, --permissions <permissions...>', 'Permissions (space-separated)')
    .option('--rate-limit <rpm>', 'Rate limit in requests per minute', parseInt)
    .option('--expires <date>', 'Expiration date (ISO 8601 format)')
    .option('--ips <ips...>', 'Allowed IP addresses (space-separated)')
    .option('--services <services...>', 'Allowed services (space-separated)')
    .action(async (options) => {
      try {
        console.log(chalk.cyan('\n🔑 Create New API Key\n'));

        // Get current organization
        const currentOrgId = await credentialsManager.getCurrentOrganizationId();
        if (!currentOrgId) {
          console.error(chalk.red('✗ No organization selected.\n'));
          console.error(chalk.yellow('  Set an organization with: nexus org switch\n'));
          process.exit(1);
        }

        // Gather API key configuration
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'API key name:',
            default: options.name,
            when: !options.name,
            validate: (input: string) => {
              if (!input || input.trim().length < 3) {
                return 'Name must be at least 3 characters';
              }
              if (input.length > 100) {
                return 'Name must be less than 100 characters';
              }
              return true;
            },
          },
          {
            type: 'list',
            name: 'environment',
            message: 'Environment:',
            choices: [
              { name: 'Production', value: 'production' },
              { name: 'Staging', value: 'staging' },
              { name: 'Development', value: 'development' },
            ],
            default: options.env || 'development',
            when: !options.env,
          },
          {
            type: 'checkbox',
            name: 'permissions',
            message: 'Select permissions:',
            choices: AVAILABLE_PERMISSIONS.map((perm) => ({
              name: perm,
              value: perm,
            })),
            when: !options.permissions,
            validate: (input: string[]) => {
              if (input.length === 0) {
                return 'Select at least one permission';
              }
              return true;
            },
          },
          {
            type: 'confirm',
            name: 'addRateLimit',
            message: 'Set rate limit?',
            default: false,
            when: !options.rateLimit,
          },
          {
            type: 'input',
            name: 'rateLimit',
            message: 'Rate limit (requests per minute):',
            default: '60',
            when: (ans: any) => ans.addRateLimit && !options.rateLimit,
            validate: (input: string) => {
              const num = parseInt(input, 10);
              if (isNaN(num) || num < 1 || num > 10000) {
                return 'Enter a number between 1 and 10000';
              }
              return true;
            },
          },
          {
            type: 'confirm',
            name: 'addExpiry',
            message: 'Set expiration date?',
            default: false,
            when: !options.expires,
          },
          {
            type: 'list',
            name: 'expiryOption',
            message: 'Expiration:',
            choices: [
              { name: '30 days', value: '30d' },
              { name: '90 days', value: '90d' },
              { name: '1 year', value: '1y' },
              { name: 'Custom date', value: 'custom' },
            ],
            when: (ans: any) => ans.addExpiry && !options.expires,
          },
          {
            type: 'input',
            name: 'expiryDate',
            message: 'Expiration date (YYYY-MM-DD):',
            when: (ans: any) => ans.expiryOption === 'custom',
            validate: (input: string) => {
              const date = new Date(input);
              if (isNaN(date.getTime())) {
                return 'Invalid date format. Use YYYY-MM-DD';
              }
              if (date <= new Date()) {
                return 'Expiration date must be in the future';
              }
              return true;
            },
          },
          {
            type: 'confirm',
            name: 'addIpWhitelist',
            message: 'Restrict to specific IP addresses?',
            default: false,
            when: !options.ips,
          },
          {
            type: 'input',
            name: 'ips',
            message: 'Allowed IPs (comma-separated):',
            when: (ans: any) => ans.addIpWhitelist && !options.ips,
            validate: (input: string) => {
              if (!input) return 'Enter at least one IP address';
              // Basic IP validation
              const ips = input.split(',').map((ip) => ip.trim());
              const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
              const invalid = ips.filter((ip) => !ipPattern.test(ip));
              if (invalid.length > 0) {
                return `Invalid IP addresses: ${invalid.join(', ')}`;
              }
              return true;
            },
          },
          {
            type: 'confirm',
            name: 'addServiceRestriction',
            message: 'Restrict to specific services?',
            default: false,
            when: !options.services,
          },
          {
            type: 'checkbox',
            name: 'services',
            message: 'Allowed services:',
            choices: [
              { name: 'GraphRAG', value: 'graphrag' },
              { name: 'MageAgent', value: 'mageagent' },
              { name: 'Analytics', value: 'analytics' },
              { name: 'Admin API', value: 'admin' },
            ],
            when: (ans: any) => ans.addServiceRestriction && !options.services,
          },
        ]);

        // Build request object
        const request: CreateAPIKeyRequest = {
          name: options.name || answers.name,
          environment: (options.env || answers.environment) as any,
          permissions: options.permissions || answers.permissions,
          organization_id: currentOrgId,
        };

        // Add optional fields
        const rateLimit = options.rateLimit || (answers.rateLimit ? parseInt(answers.rateLimit, 10) : null);
        if (rateLimit) {
          request.rate_limit_rpm = rateLimit;
        }

        // Handle expiry
        let expiresAt: string | undefined;
        if (options.expires) {
          expiresAt = options.expires;
        } else if (answers.expiryOption) {
          const now = new Date();
          switch (answers.expiryOption) {
            case '30d':
              now.setDate(now.getDate() + 30);
              expiresAt = now.toISOString();
              break;
            case '90d':
              now.setDate(now.getDate() + 90);
              expiresAt = now.toISOString();
              break;
            case '1y':
              now.setFullYear(now.getFullYear() + 1);
              expiresAt = now.toISOString();
              break;
            case 'custom':
              expiresAt = new Date(answers.expiryDate).toISOString();
              break;
          }
        }
        if (expiresAt) {
          request.expires_at = expiresAt;
        }

        // Handle IP whitelist
        if (options.ips) {
          request.allowed_ips = options.ips;
        } else if (answers.ips) {
          request.allowed_ips = answers.ips.split(',').map((ip: string) => ip.trim());
        }

        // Handle service restrictions
        if (options.services) {
          request.allowed_services = options.services;
        } else if (answers.services) {
          request.allowed_services = answers.services;
        }

        // Create API key
        const spinner = ora('Creating API key...').start();

        try {
          const apiKey = await authClient.createAPIKey(request);

          spinner.succeed(chalk.green('API key created successfully!'));

          // Display the full key with prominent warning
          console.log(chalk.cyan('\n🔐 API Key Details\n'));
          console.log(chalk.red.bold('⚠️  SAVE THIS KEY NOW - IT WILL NOT BE SHOWN AGAIN!\n'));

          console.log(chalk.yellow.bold('━'.repeat(80)));
          console.log(chalk.white.bold(`  ${apiKey.key}`));
          console.log(chalk.yellow.bold('━'.repeat(80)));

          console.log(chalk.dim('\n  Key Details:\n'));
          console.log(`  Name: ${chalk.white(apiKey.name)}`);
          console.log(`  Prefix: ${chalk.dim(apiKey.key_prefix)}`);
          console.log(`  Environment: ${chalk.white(apiKey.environment)}`);
          console.log(`  Permissions: ${chalk.dim(apiKey.permissions.join(', '))}`);
          console.log(
            `  Created: ${chalk.dim(new Date(apiKey.created_at).toLocaleString())}`
          );

          if (request.rate_limit_rpm) {
            console.log(`  Rate Limit: ${chalk.white(request.rate_limit_rpm)} req/min`);
          }

          if (request.expires_at) {
            console.log(
              `  Expires: ${chalk.yellow(new Date(request.expires_at).toLocaleDateString())}`
            );
          }

          if (request.allowed_ips && request.allowed_ips.length > 0) {
            console.log(`  Allowed IPs: ${chalk.dim(request.allowed_ips.join(', '))}`);
          }

          if (request.allowed_services && request.allowed_services.length > 0) {
            console.log(
              `  Allowed Services: ${chalk.dim(request.allowed_services.join(', '))}`
            );
          }

          console.log(chalk.red.bold('\n  ⚠️  ' + apiKey.warning));

          // Save reference locally (without the secret)
          await credentialsManager.saveAPIKeyReference({
            id: apiKey.id,
            key_prefix: apiKey.key_prefix,
            name: apiKey.name,
            environment: apiKey.environment as any,
            permissions: apiKey.permissions,
            organization_id: currentOrgId,
            rate_limit_rpm: request.rate_limit_rpm,
            allowed_ips: request.allowed_ips,
            allowed_services: request.allowed_services,
            expires_at: request.expires_at,
            revoked: false,
            created_at: apiKey.created_at,
          });

          console.log(
            chalk.dim(
              '\n  API key reference saved locally (run `nexus api-key list` to view)\n'
            )
          );
        } catch (error: any) {
          spinner.fail(chalk.red('Failed to create API key'));

          if (error.code === 'AUTH_TOKEN_EXPIRED') {
            console.error(chalk.red('\n✗ Session expired. Please login again.\n'));
          } else if (error.code === 'APIKEY_LIMIT_REACHED') {
            console.error(
              chalk.red('\n✗ You have reached the maximum number of API keys.\n')
            );
            console.error(
              chalk.yellow('  Please delete unused keys or upgrade your plan.\n')
            );
          } else if (error.code === 'PERMISSION_DENIED') {
            console.error(
              chalk.red('\n✗ You do not have permission to create API keys.\n')
            );
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
