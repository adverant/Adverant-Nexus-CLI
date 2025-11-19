/**
 * Commander.js Integration Example
 *
 * Shows how to integrate the command router with Commander.js
 */

import { Command as CommanderCommand } from 'commander';
import {
  createCommandRegistry,
  createCommandRouter,
  type Command,
  type CommandContext,
  type CommandArgs,
} from '../index.js';

/**
 * Convert router Command to Commander.js Command
 */
export function commandToCommander(
  command: Command,
  router: ReturnType<typeof createCommandRouter>,
  context: CommandContext
): CommanderCommand {
  const fullName = command.namespace
    ? `${command.namespace}:${command.name}`
    : command.name;

  const program = new CommanderCommand(fullName);

  // Set description
  program.description(command.description);

  // Add arguments
  if (command.args) {
    for (const arg of command.args) {
      const argStr = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
      const argDesc = arg.variadic ? `${arg.description} (variadic)` : arg.description;
      program.argument(argStr, argDesc, arg.default);
    }
  }

  // Add options
  if (command.options) {
    for (const opt of command.options) {
      const flags = opt.short
        ? `-${opt.short}, --${opt.long}`
        : `--${opt.long}`;

      const optDesc = opt.env
        ? `${opt.description} (env: ${opt.env})`
        : opt.description;

      // Handle different option types
      switch (opt.type) {
        case 'boolean':
          program.option(flags, optDesc, opt.default);
          break;
        case 'number':
          program.option(
            flags + ' <value>',
            optDesc,
            (val) => parseInt(val, 10),
            opt.default
          );
          break;
        case 'array':
          program.option(
            flags + ' <items...>',
            optDesc,
            opt.default
          );
          break;
        default:
          program.option(flags + ' <value>', optDesc, opt.default);
      }
    }
  }

  // Add aliases
  if (command.aliases) {
    program.aliases(command.aliases);
  }

  // Set action
  program.action(async (...args) => {
    const commandArgs = parseCommanderArgs(args, command);

    try {
      const result = await router.route(fullName, commandArgs, context);

      if (!result.success) {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }

      // Output result
      if (result.message) {
        console.log(result.message);
      }

      if (result.data && !context.quiet) {
        if (context.outputFormat === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(result.data);
        }
      }
    } catch (error: any) {
      console.error(`Fatal error: ${error.message}`);
      if (context.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

  // Add usage examples
  if (command.examples && command.examples.length > 0) {
    program.addHelpText('after', '\nExamples:');
    for (const example of command.examples) {
      program.addHelpText('after', `  $ ${example}`);
    }
  }

  return program;
}

/**
 * Parse Commander.js args to CommandArgs format
 */
function parseCommanderArgs(args: any[], command: Command): CommandArgs {
  const commandArgs: CommandArgs = { _: [] };

  // Extract positional arguments
  const numArgs = command.args?.length || 0;
  for (let i = 0; i < numArgs && i < args.length - 1; i++) {
    commandArgs._.push(args[i]);
  }

  // Extract options (last argument is the Command object)
  const options = args[args.length - 1];
  if (options && typeof options === 'object') {
    for (const [key, value] of Object.entries(options)) {
      // Skip internal Commander properties
      if (!key.startsWith('_') && key !== 'options' && key !== 'parent') {
        commandArgs[key] = value;
      }
    }
  }

  return commandArgs;
}

/**
 * Create Commander.js program from router registry
 */
export function createCommanderProgram(
  registry: ReturnType<typeof createCommandRegistry>,
  router: ReturnType<typeof createCommandRouter>,
  context: CommandContext
): CommanderCommand {
  const program = new CommanderCommand();

  // Set program metadata
  program
    .name('nexus')
    .description('Nexus CLI - Unified interface for Nexus services')
    .version('3.0.0');

  // Add global options
  program
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('--format <type>', 'Output format (text, json, yaml)', 'text')
    .option('--config <path>', 'Path to config file');

  // Get all commands
  const commands = registry.list();

  // Group commands by namespace
  const namespaces = new Map<string, Command[]>();
  for (const command of commands) {
    const namespace = command.namespace || 'general';
    const existing = namespaces.get(namespace) || [];
    existing.push(command);
    namespaces.set(namespace, existing);
  }

  // Create subcommands for each namespace
  for (const [namespace, cmds] of namespaces) {
    if (namespace === 'general') {
      // Add top-level commands
      for (const cmd of cmds) {
        const subcommand = commandToCommander(cmd, router, context);
        program.addCommand(subcommand);
      }
    } else {
      // Create namespace subcommand
      const nsCommand = new CommanderCommand(namespace);
      nsCommand.description(`${namespace} commands`);

      // Add commands to namespace
      for (const cmd of cmds) {
        const subcommand = commandToCommander(cmd, router, context);
        // Remove namespace prefix from subcommand name
        subcommand.name(cmd.name);
        nsCommand.addCommand(subcommand);
      }

      program.addCommand(nsCommand);
    }
  }

  return program;
}

/**
 * Example: Full CLI setup with Commander.js
 */
export async function setupCLI() {
  // 1. Create router
  const registry = createCommandRegistry();
  const router = createCommandRouter(registry);

  // 2. Register commands (from your command definitions)
  registerCommands(registry);

  // 3. Discover dynamic commands
  await registry.discoverDynamicCommands();

  // 4. Create context
  const context: CommandContext = {
    cwd: process.cwd(),
    config: {},
    services: new Map(),
    verbose: false,
    quiet: false,
    outputFormat: 'text',
    transport: null,
  };

  // 5. Create Commander program
  const program = createCommanderProgram(registry, router, context);

  // 6. Parse arguments
  await program.parseAsync(process.argv);
}

/**
 * Register example commands
 */
function registerCommands(registry: ReturnType<typeof createCommandRegistry>) {
  // Help command
  registry.register({
    name: 'help',
    description: 'Display help information',
    handler: async () => ({
      success: true,
      message: 'Use --help with any command for more information',
    }),
  });

  // Services namespace
  registry.register({
    name: 'health',
    namespace: 'services',
    description: 'Check health of Nexus services',
    options: [
      {
        long: 'service',
        short: 's',
        description: 'Specific service to check',
        type: 'string',
      },
    ],
    handler: async (args) => ({
      success: true,
      data: {
        service: args.service || 'all',
        status: 'healthy',
      },
    }),
    examples: [
      'nexus services health',
      'nexus services health --service graphrag',
    ],
  });

  registry.register({
    name: 'start',
    namespace: 'services',
    description: 'Start Nexus services',
    args: [
      {
        name: 'services',
        description: 'Services to start',
        required: false,
        type: 'array',
        variadic: true,
      },
    ],
    handler: async (args) => ({
      success: true,
      message: `Starting services: ${args._.join(', ') || 'all'}`,
    }),
    examples: ['nexus services start', 'nexus services start graphrag mageagent'],
  });

  // GraphRAG namespace
  registry.register({
    name: 'query',
    namespace: 'graphrag',
    description: 'Query the GraphRAG service',
    args: [
      {
        name: 'query',
        description: 'Query string',
        required: true,
        type: 'string',
      },
    ],
    options: [
      {
        long: 'limit',
        short: 'l',
        description: 'Number of results',
        type: 'number',
        default: 10,
      },
      {
        long: 'format',
        short: 'f',
        description: 'Output format',
        type: 'string',
        choices: ['text', 'json', 'markdown'],
        default: 'text',
      },
    ],
    handler: async (args) => ({
      success: true,
      data: {
        query: args._[0],
        results: [],
        limit: args.limit,
      },
    }),
    examples: [
      'nexus graphrag query "What is the architecture?"',
      'nexus graphrag query "Find errors" --limit 5',
    ],
  });

  // MageAgent namespace
  registry.register({
    name: 'run',
    namespace: 'mageagent',
    description: 'Run a MageAgent task',
    args: [
      {
        name: 'task',
        description: 'Task description',
        required: true,
        type: 'string',
      },
    ],
    options: [
      {
        long: 'interactive',
        short: 'i',
        description: 'Interactive mode',
        type: 'boolean',
      },
      {
        long: 'timeout',
        short: 't',
        description: 'Task timeout in seconds',
        type: 'number',
        default: 300,
      },
    ],
    handler: async (args) => ({
      success: true,
      message: `Running task: ${args._[0]}`,
      data: {
        task: args._[0],
        interactive: args.interactive || false,
        timeout: args.timeout,
      },
    }),
    examples: [
      'nexus mageagent run "Analyze code quality"',
      'nexus mageagent run "Fix bugs" --interactive',
    ],
  });
}

/**
 * Run CLI
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCLI().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
