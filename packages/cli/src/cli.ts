/**
 * Nexus CLI - Main Application
 *
 * Orchestrates the entire CLI system with Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// Core systems
import { ConfigManager } from './core/config/config-manager.js';
import { AuthClient } from './auth/auth-client.js';
import { CredentialsManager } from './auth/credentials-manager.js';
import { ServiceDiscovery } from './core/discovery/service-discovery.js';
import { CommandRegistry } from './core/router/command-registry.js';
import { CommandRouter } from './core/router/command-router.js';

// Command imports
import { createLoginCommand, createRegisterCommand, createLogoutCommand, createWhoAmICommand } from './commands/auth/index.js';
import { createListOrganizationsCommand, createCreateOrganizationCommand, createSwitchOrganizationCommand, createOrganizationInfoCommand } from './commands/org/index.js';
import { createCreateAPIKeyCommand, createListAPIKeysCommand, createDeleteAPIKeyCommand, createAPIKeyInfoCommand, createRotateAPIKeyCommand } from './commands/api-key/index.js';
import { createServicesCommand } from './commands/services/index.js';
import { createPluginCommand } from './commands/plugin/index.js';
import { createAgentCommand } from './commands/agent/index.js';
import { createSessionCommand } from './commands/session/index.js';
import { createWorkspaceCommand } from './commands/workspace/index.js';

// Load environment variables
dotenv.config({ path: path.join(os.homedir(), '.nexus', '.env') });
dotenv.config(); // Also load from current directory

/**
 * Initialize core systems
 */
async function initializeSystems() {
  // Initialize config manager
  const configManager = new ConfigManager();
  await configManager.load();

  // Get API URL from config or environment
  const configApiUrl = configManager.get('api.url');
  const apiUrl = process.env.NEXUS_API_URL ||
    (typeof configApiUrl === 'string' ? configApiUrl : 'http://localhost:9092');

  // Initialize auth systems
  const authClient = new AuthClient({ baseURL: apiUrl });
  const credentialsManager = new CredentialsManager();

  // Check if authenticated and set token
  const credentials = await credentialsManager.loadCredentials();
  if (credentials && !credentialsManager.isExpired(credentials)) {
    authClient.setAccessToken(credentials.access_token);
  }

  // Initialize service discovery
  const composeFiles = process.env.DOCKER_COMPOSE_PATH
    ? [process.env.DOCKER_COMPOSE_PATH]
    : undefined;
  const serviceDiscovery = new ServiceDiscovery(
    composeFiles ? { composeFiles } : {}
  );

  // Initialize command systems
  const commandRegistry = new CommandRegistry();
  const commandRouter = new CommandRouter(commandRegistry);

  return {
    configManager,
    authClient,
    credentialsManager,
    serviceDiscovery,
    commandRegistry,
    commandRouter,
  };
}

/**
 * Register all CLI commands
 */
function registerCommands(
  program: Command,
  authClient: AuthClient,
  credentialsManager: CredentialsManager
): void {
  // Auth commands
  const authCommand = program
    .command('auth')
    .description('Authentication commands');

  authCommand.addCommand(createLoginCommand(authClient, credentialsManager));
  authCommand.addCommand(createRegisterCommand(authClient, credentialsManager));
  authCommand.addCommand(createLogoutCommand(authClient, credentialsManager));
  authCommand.addCommand(createWhoAmICommand(authClient, credentialsManager));

  // Organization commands
  const orgCommand = program
    .command('org')
    .alias('organization')
    .description('Organization management');

  orgCommand.addCommand(createListOrganizationsCommand(authClient, credentialsManager));
  orgCommand.addCommand(createCreateOrganizationCommand(authClient, credentialsManager));
  orgCommand.addCommand(createSwitchOrganizationCommand(authClient, credentialsManager));
  orgCommand.addCommand(createOrganizationInfoCommand(authClient, credentialsManager));

  // API Key commands
  const apiKeyCommand = program
    .command('api-key')
    .alias('key')
    .description('API key management');

  apiKeyCommand.addCommand(createCreateAPIKeyCommand(authClient, credentialsManager));
  apiKeyCommand.addCommand(createListAPIKeysCommand(authClient, credentialsManager));
  apiKeyCommand.addCommand(createDeleteAPIKeyCommand(authClient, credentialsManager));
  apiKeyCommand.addCommand(createAPIKeyInfoCommand(authClient, credentialsManager));
  apiKeyCommand.addCommand(createRotateAPIKeyCommand(authClient, credentialsManager));

  // Services commands
  program.addCommand(createServicesCommand());

  // Plugin commands
  program.addCommand(createPluginCommand());

  // Agent commands
  program.addCommand(createAgentCommand());

  // Session commands
  program.addCommand(createSessionCommand());

  // Workspace commands
  program.addCommand(createWorkspaceCommand());

  // TODO: Add more command groups
  // - mcp (dynamic MCP tool commands)
  // - config (get, set, list, profile)
}

/**
 * Main CLI entry point
 */
export async function runCLI(): Promise<void> {
  // Initialize systems
  const systems = await initializeSystems();

  // Create Commander.js program
  const program = new Command();

  program
    .name('nexus')
    .description('World-class CLI for the Adverant-Nexus platform')
    .version('3.0.0', '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information');

  // Global options
  program
    .option('--no-banner', 'Disable startup banner')
    .option('--api-url <url>', 'Override Nexus API URL')
    .option('--profile <name>', 'Use specific configuration profile')
    .option('--output <format>', 'Output format (text, json, yaml, table)', 'text')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Enable verbose output')
    .option('--debug', 'Enable debug mode')
    .option('--quiet', 'Suppress non-essential output');

  // Register all commands
  registerCommands(program, systems.authClient, systems.credentialsManager);

  // Add version command with full banner
  program
    .command('version')
    .description('Show Nexus CLI version with banner')
    .action(() => {
      const { displayBanner } = require('./utils/banner.js');
      displayBanner('3.0.0', {
        variant: 'standard',
        theme: 'hexagon',
        colored: true,
        showVersion: true,
        showTagline: true,
      });
    });

  // Add REPL command
  program
    .command('repl')
    .alias('shell')
    .description('Start interactive REPL shell')
    .action(async () => {
      const { REPL } = await import('./repl/repl.js');
      const discovery = await systems.serviceDiscovery.discover();
      const repl = new REPL({
        config: systems.configManager,
        services: discovery.services,
        commands: discovery.commands as any, // ServiceCommand compatible with Command
        version: program.version() || '1.0.0',
      });
      await repl.start();
    });

  // Handle unknown commands
  program.on('command:*', (operands) => {
    console.error(chalk.red(`\n✗ Unknown command: ${operands[0]}\n`));
    console.log(chalk.yellow('Run "nexus --help" to see available commands.\n'));
    process.exit(1);
  });

  // Parse arguments
  try {
    await program.parseAsync(process.argv);

    // Show help if no command provided
    if (process.argv.length <= 2) {
      program.help();
    }
  } catch (error: any) {
    console.error(chalk.red(`\n✗ Error: ${error.message}\n`));

    if (error.code) {
      console.error(chalk.red(`  Code: ${error.code}\n`));
    }

    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error(chalk.dim(error.stack));
    }

    process.exit(1);
  }
}
