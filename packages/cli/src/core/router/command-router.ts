/**
 * Command Router
 *
 * Routes commands to appropriate handlers with:
 * - Intelligent command resolution (namespace, aliases, etc.)
 * - Argument validation
 * - Error handling
 * - Performance tracking
 * - Middleware support
 */

import type {
  Command,
  CommandArgs,
  CommandContext,
  CommandResult,
} from '../../types/index.js';
import { CommandRegistry } from './command-registry.js';

/**
 * Middleware function type for command execution
 */
export type CommandMiddleware = (
  command: Command,
  args: CommandArgs,
  context: CommandContext,
  next: () => Promise<CommandResult>
) => Promise<CommandResult>;

/**
 * Command Router Implementation
 *
 * Handles:
 * - Command resolution with multiple strategies
 * - Validation before execution
 * - Middleware chain execution
 * - Error handling and reporting
 * - Performance metrics
 */
export class CommandRouter {
  private middlewares: CommandMiddleware[] = [];

  constructor(private registry: CommandRegistry) {}

  /**
   * Add middleware to the execution chain
   *
   * Middleware is executed in the order it was added
   *
   * @param middleware - Middleware function
   *
   * @example
   * router.use(async (command, args, context, next) => {
   *   console.log(`Executing ${command.name}`);
   *   const result = await next();
   *   console.log(`Completed ${command.name}`);
   *   return result;
   * });
   */
  use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Route and execute a command
   *
   * Execution flow:
   * 1. Find command using resolution strategies
   * 2. Validate arguments if validator exists
   * 3. Execute middleware chain
   * 4. Execute command handler
   * 5. Return result with metadata
   *
   * @param commandName - Command name (can include namespace)
   * @param args - Command arguments
   * @param context - Execution context
   * @returns Command execution result
   */
  async route(
    commandName: string,
    args: CommandArgs,
    context: CommandContext
  ): Promise<CommandResult> {
    // Find command using multiple resolution strategies
    const command = this.findCommand(commandName);

    if (!command) {
      return {
        success: false,
        error: `Command '${commandName}' not found. Use 'nexus --help' to see available commands.`,
      };
    }

    // Validate arguments if validator exists
    if (command.validator) {
      try {
        const validation = await command.validator(args, context);
        if (!validation.valid) {
          const errors = validation.errors?.map((e) => e.message).join(', ');
          return {
            success: false,
            error: `Validation failed: ${errors}`,
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Validation error: ${error.message}`,
        };
      }
    }

    // Execute command with middleware chain
    try {
      const startTime = Date.now();

      // Build middleware chain
      const result = await this.executeWithMiddleware(
        command,
        args,
        context,
        0
      );

      const duration = Date.now() - startTime;

      // Add execution metadata
      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration,
          ...(command.namespace && { service: command.namespace }),
        },
      };
    } catch (error: any) {
      // Handle unexpected errors
      const errorResult: CommandResult = {
        success: false,
        error: error.message || 'Command execution failed',
      };

      // Add metadata only if we have data to add
      if (command.namespace || error.name || error.stack) {
        errorResult.metadata = {
          ...(command.namespace && { service: command.namespace }),
        };
      }

      return errorResult;
    }
  }

  /**
   * Execute command with middleware chain
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @param context - Execution context
   * @param index - Current middleware index
   * @returns Command result
   */
  private async executeWithMiddleware(
    command: Command,
    args: CommandArgs,
    context: CommandContext,
    index: number
  ): Promise<CommandResult> {
    // If we've reached the end of middleware chain, execute handler
    if (index >= this.middlewares.length) {
      return command.handler(args, context);
    }

    // Execute current middleware with next() function
    const middleware = this.middlewares[index];
    if (!middleware) {
      return command.handler(args, context);
    }
    return middleware(command, args, context, async () => {
      return this.executeWithMiddleware(command, args, context, index + 1);
    });
  }

  /**
   * Find command by name using multiple resolution strategies
   *
   * Resolution strategies (in order):
   * 1. Direct lookup (exact match)
   * 2. Namespace prefix (e.g., "services:health")
   * 3. Common namespaces (services, graphrag, mageagent, etc.)
   * 4. Command aliases
   *
   * @param commandName - Command name to find
   * @returns Command definition or undefined
   */
  private findCommand(commandName: string): Command | undefined {
    // Strategy 1: Direct lookup
    let command = this.registry.resolve(commandName);
    if (command) return command;

    // Strategy 2: Try with namespace prefix (e.g., "graphrag:query")
    if (commandName.includes(':')) {
      const [namespace = '', name = ''] = commandName.split(':', 2);
      command = this.registry.get(name, namespace);
      if (command) return command;
    }

    // Strategy 3: Try common namespaces
    const commonNamespaces = [
      'services',
      'graphrag',
      'mageagent',
      'sandbox',
      'mcp',
      'plugins',
    ];
    for (const namespace of commonNamespaces) {
      command = this.registry.get(commandName, namespace);
      if (command) return command;
    }

    // Strategy 4: Try aliases
    const allCommands = this.registry.list();
    for (const cmd of allCommands) {
      if (cmd.aliases?.includes(commandName)) {
        return cmd;
      }
    }

    return undefined;
  }

  /**
   * Get all available commands, optionally filtered by namespace
   *
   * @param namespace - Optional namespace filter
   * @returns Array of commands
   */
  listCommands(namespace?: string): Command[] {
    return this.registry.list(namespace);
  }

  /**
   * Get all registered namespaces
   *
   * @returns Array of namespace strings
   */
  listNamespaces(): string[] {
    return this.registry.listNamespaces();
  }

  /**
   * Search for commands by keyword
   *
   * @param keyword - Search keyword
   * @returns Array of matching commands
   */
  searchCommands(keyword: string): Command[] {
    return this.registry.search(keyword);
  }

  /**
   * Get commands organized by category
   *
   * @returns Map of category to commands
   */
  getCommandsByCategory(): Map<string, Command[]> {
    return this.registry.getByCategory();
  }

  /**
   * Validate command exists and is accessible
   *
   * @param commandName - Command name to validate
   * @param context - Execution context (for auth/workspace checks)
   * @returns Validation result with error message if invalid
   */
  validateCommand(
    commandName: string,
    context: CommandContext
  ): { valid: boolean; error?: string; command?: Command } {
    const command = this.findCommand(commandName);

    if (!command) {
      return {
        valid: false,
        error: `Command '${commandName}' not found`,
      };
    }

    // Check authentication requirement
    if (command.requiresAuth && !context.config?.auth?.token) {
      return {
        valid: false,
        error: `Command '${commandName}' requires authentication. Run 'nexus auth login' first.`,
        command,
      };
    }

    // Check workspace requirement
    if (command.requiresWorkspace && !context.workspace) {
      return {
        valid: false,
        error: `Command '${commandName}' requires a workspace. Run from within a project directory.`,
        command,
      };
    }

    return {
      valid: true,
      command,
    };
  }

  /**
   * Get command help text
   *
   * @param commandName - Command name
   * @returns Help text or undefined if command not found
   */
  getCommandHelp(commandName: string): string | undefined {
    const command = this.findCommand(commandName);
    if (!command) return undefined;

    let help = `${command.name} - ${command.description}\n\n`;

    if (command.usage) {
      help += `Usage: ${command.usage}\n\n`;
    }

    if (command.args && command.args.length > 0) {
      help += 'Arguments:\n';
      for (const arg of command.args) {
        const required = arg.required ? '(required)' : '(optional)';
        help += `  ${arg.name} ${required} - ${arg.description}\n`;
      }
      help += '\n';
    }

    if (command.options && command.options.length > 0) {
      help += 'Options:\n';
      for (const option of command.options) {
        const flags = option.short
          ? `-${option.short}, --${option.long}`
          : `--${option.long}`;
        help += `  ${flags} - ${option.description}\n`;
      }
      help += '\n';
    }

    if (command.examples && command.examples.length > 0) {
      help += 'Examples:\n';
      for (const example of command.examples) {
        help += `  ${example}\n`;
      }
    }

    return help;
  }

  /**
   * Clear all registered middleware
   */
  clearMiddleware(): void {
    this.middlewares = [];
  }
}

/**
 * Factory function to create a new CommandRouter instance
 *
 * @param registry - Command registry to use
 * @returns New CommandRouter instance
 */
export function createCommandRouter(registry: CommandRegistry): CommandRouter {
  return new CommandRouter(registry);
}
