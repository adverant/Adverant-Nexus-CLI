/**
 * Basic Router Usage Example
 *
 * Demonstrates how to set up and use the command router
 */

import {
  createCommandRegistry,
  createCommandRouter,
  createDefaultMiddleware,
  type Command,
  type CommandContext,
  type DynamicCommandSource,
} from '../index.js';

// Example: Create and configure the router
export function setupRouter() {
  // 1. Create registry
  const registry = createCommandRegistry();

  // 2. Register static commands
  registerStaticCommands(registry);

  // 3. Register dynamic sources
  registerDynamicSources(registry);

  // 4. Create router
  const router = createCommandRouter(registry);

  // 5. Add middleware
  const middleware = createDefaultMiddleware({
    verbose: true,
    telemetry: (command, args, result, duration) => {
      console.log('[Telemetry]', {
        command: command.name,
        success: result.success,
        duration,
      });
    },
  });

  middleware.forEach((m) => router.use(m));

  return { registry, router };
}

// Example: Register static commands
function registerStaticCommands(
  registry: ReturnType<typeof createCommandRegistry>
) {
  // Help command
  registry.register({
    name: 'help',
    description: 'Show help information',
    args: [
      {
        name: 'command',
        description: 'Command to get help for',
        required: false,
        type: 'string',
      },
    ],
    handler: async (args, context) => {
      const commandName = args._[0];

      if (commandName) {
        const command = registry.resolve(commandName);
        if (!command) {
          return {
            success: false,
            error: `Command '${commandName}' not found`,
          };
        }

        return {
          success: true,
          message: formatCommandHelp(command),
        };
      }

      // Show all commands
      const commands = registry.list();
      const categories = registry.getByCategory();

      let help = 'Available Commands:\n\n';

      for (const [category, cmds] of categories) {
        help += `${category}:\n`;
        for (const cmd of cmds) {
          const fullName = cmd.namespace
            ? `${cmd.namespace}:${cmd.name}`
            : cmd.name;
          help += `  ${fullName.padEnd(30)} ${cmd.description}\n`;
        }
        help += '\n';
      }

      return {
        success: true,
        message: help,
      };
    },
    examples: ['nexus help', 'nexus help services:health'],
  });

  // Version command
  registry.register({
    name: 'version',
    aliases: ['v'],
    description: 'Show CLI version',
    handler: async () => ({
      success: true,
      message: 'Nexus CLI v3.0.0',
      data: { version: '3.0.0' },
    }),
  });

  // Services health check
  registry.register({
    name: 'health',
    namespace: 'services',
    description: 'Check health of all services',
    options: [
      {
        long: 'service',
        short: 's',
        description: 'Specific service to check',
        type: 'string',
      },
      {
        long: 'verbose',
        short: 'v',
        description: 'Show detailed health information',
        type: 'boolean',
      },
    ],
    handler: async (args, context) => {
      const serviceName = args.service;
      const verbose = args.verbose || context.verbose;

      // Mock health check
      const services = Array.from(context.services.values());

      if (serviceName) {
        const service = services.find((s) => s.name === serviceName);
        if (!service) {
          return {
            success: false,
            error: `Service '${serviceName}' not found`,
          };
        }

        return {
          success: true,
          data: {
            service: service.name,
            status: 'healthy',
            uptime: '2h 34m',
          },
        };
      }

      return {
        success: true,
        data: {
          total: services.length,
          healthy: services.length,
          services: services.map((s) => ({
            name: s.name,
            status: 'healthy',
          })),
        },
      };
    },
    examples: [
      'nexus services:health',
      'nexus services:health --service graphrag',
      'nexus services:health -v',
    ],
  });
}

// Example: Register dynamic command sources
function registerDynamicSources(
  registry: ReturnType<typeof createCommandRegistry>
) {
  // Service commands source
  const serviceSource: DynamicCommandSource = {
    namespace: 'services',

    async discover() {
      // In real implementation, discover services from:
      // - Service discovery
      // - Docker Compose
      // - Kubernetes
      const services = ['graphrag', 'mageagent', 'sandbox'];

      return services.map((service) => ({
        name: `${service}:status`,
        namespace: 'services',
        description: `Get ${service} service status`,
        handler: async (args, context) => {
          return {
            success: true,
            data: {
              service,
              status: 'running',
              version: '1.0.0',
            },
          };
        },
      }));
    },

    async refresh() {
      // Re-discover services
      console.log('[Services] Refreshing service list...');
    },
  };

  registry.registerDynamicSource(serviceSource);

  // MCP tools source
  const mcpSource: DynamicCommandSource = {
    namespace: 'mcp',

    async discover() {
      // In real implementation, discover MCP tools
      const tools = [
        { name: 'filesystem', description: 'File system operations' },
        { name: 'github', description: 'GitHub integration' },
      ];

      return tools.map((tool) => ({
        name: tool.name,
        namespace: 'mcp',
        description: tool.description,
        handler: async (args, context) => {
          return {
            success: true,
            message: `Executing MCP tool: ${tool.name}`,
          };
        },
      }));
    },

    async refresh() {
      console.log('[MCP] Refreshing tool list...');
    },
  };

  registry.registerDynamicSource(mcpSource);
}

// Helper: Format command help
function formatCommandHelp(command: Command): string {
  let help = `Command: ${command.name}\n`;

  if (command.namespace) {
    help += `Namespace: ${command.namespace}\n`;
  }

  help += `\nDescription: ${command.description}\n`;

  if (command.usage) {
    help += `\nUsage: ${command.usage}\n`;
  }

  if (command.args && command.args.length > 0) {
    help += '\nArguments:\n';
    for (const arg of command.args) {
      const required = arg.required ? '(required)' : '(optional)';
      help += `  ${arg.name} ${required} - ${arg.description}\n`;
    }
  }

  if (command.options && command.options.length > 0) {
    help += '\nOptions:\n';
    for (const option of command.options) {
      const flags = option.short
        ? `-${option.short}, --${option.long}`
        : `--${option.long}`;
      help += `  ${flags.padEnd(20)} ${option.description}\n`;
    }
  }

  if (command.examples && command.examples.length > 0) {
    help += '\nExamples:\n';
    for (const example of command.examples) {
      help += `  ${example}\n`;
    }
  }

  return help;
}

// Example: Execute a command
export async function executeCommand(
  commandName: string,
  args: any,
  context: CommandContext
) {
  const { router, registry } = setupRouter();

  // Discover dynamic commands
  await registry.discoverDynamicCommands();

  // Route and execute
  const result = await router.route(commandName, args, context);

  if (result.success) {
    console.log('Success:', result.message || result.data);
  } else {
    console.error('Error:', result.error);
    process.exit(1);
  }

  return result;
}

// Example: Main CLI entry point
export async function main() {
  const context: CommandContext = {
    cwd: process.cwd(),
    config: {},
    services: new Map([
      ['graphrag', { name: 'graphrag', url: 'http://localhost:9000' }],
      ['mageagent', { name: 'mageagent', url: 'http://localhost:9001' }],
    ]),
    verbose: false,
    quiet: false,
    outputFormat: 'text',
    transport: null,
  };

  // Example commands
  await executeCommand('help', { _: [] }, context);
  await executeCommand('services:health', { _: [] }, context);
  await executeCommand('version', { _: [] }, context);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
