/**
 * Built-in Command Middleware
 *
 * Common middleware functions for command execution:
 * - Authentication checks
 * - Logging and telemetry
 * - Error handling
 * - Performance tracking
 */

import type {
  Command,
  CommandArgs,
  CommandContext,
  CommandResult,
} from '@adverant/nexus-cli-types';

/**
 * Middleware function type
 */
export type CommandMiddleware = (
  command: Command,
  args: CommandArgs,
  context: CommandContext,
  next: () => Promise<CommandResult>
) => Promise<CommandResult>;

/**
 * Authentication middleware
 *
 * Checks if user is authenticated when command requires it
 */
export function authMiddleware(): CommandMiddleware {
  return async (command, _args, context, next) => {
    if (command.requiresAuth && !context.config?.auth?.token) {
      return {
        success: false,
        error: `Command '${command.name}' requires authentication. Run 'nexus auth login' first.`,
      };
    }

    return next();
  };
}

/**
 * Workspace validation middleware
 *
 * Checks if command is run within a workspace when required
 */
export function workspaceMiddleware(): CommandMiddleware {
  return async (command, _args, context, next) => {
    if (command.requiresWorkspace && !context.workspace) {
      return {
        success: false,
        error: `Command '${command.name}' requires a workspace. Run from within a project directory.`,
      };
    }

    return next();
  };
}

/**
 * Logging middleware
 *
 * Logs command execution with timing information
 */
export function loggingMiddleware(verbose: boolean = false): CommandMiddleware {
  return async (command, args, context, next) => {
    const startTime = Date.now();
    const fullName = command.namespace
      ? `${command.namespace}:${command.name}`
      : command.name;

    if (verbose || context.verbose) {
      console.log(`[Router] Executing command: ${fullName}`);
      console.log(`[Router] Arguments:`, args);
    }

    const result = await next();

    const duration = Date.now() - startTime;

    if (verbose || context.verbose) {
      console.log(
        `[Router] Command ${fullName} completed in ${duration}ms (success: ${result.success})`
      );
    }

    return result;
  };
}

/**
 * Error handling middleware
 *
 * Catches and formats errors consistently
 */
export function errorHandlingMiddleware(): CommandMiddleware {
  return async (command, _args, context, next) => {
    try {
      return await next();
    } catch (error: any) {
      // Format error consistently
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        metadata: {
          ...(command.namespace && { service: command.namespace }),
          error: {
            name: error.name,
            code: error.code,
            ...(context.verbose && error.stack && { stack: error.stack }),
          },
        },
      };
    }
  };
}

/**
 * Telemetry middleware
 *
 * Tracks command usage for analytics
 */
export function telemetryMiddleware(
  onCommandExecuted?: (
    command: Command,
    args: CommandArgs,
    result: CommandResult,
    duration: number
  ) => void
): CommandMiddleware {
  return async (command, args, _context, next) => {
    const startTime = Date.now();

    const result = await next();

    const duration = Date.now() - startTime;

    // Call telemetry callback if provided
    if (onCommandExecuted) {
      try {
        onCommandExecuted(command, args, result, duration);
      } catch (error) {
        // Don't fail command if telemetry fails
        console.error('[Telemetry] Error:', error);
      }
    }

    return result;
  };
}

/**
 * Dry-run middleware
 *
 * Prevents command execution when --dry-run flag is set
 */
export function dryRunMiddleware(): CommandMiddleware {
  return async (command, args, context, next) => {
    if (args['dry-run'] || args['dryRun']) {
      const fullName = command.namespace
        ? `${command.namespace}:${command.name}`
        : command.name;

      return {
        success: true,
        message: `[DRY RUN] Would execute: ${fullName}`,
        data: {
          command: fullName,
          args,
          context: {
            cwd: context.cwd,
            workspace: context.workspace?.root,
          },
        },
      };
    }

    return next();
  };
}

/**
 * Confirmation middleware
 *
 * Asks for confirmation before executing destructive commands
 */
export function confirmationMiddleware(
  isDestructive: (command: Command) => boolean,
  confirm: (message: string) => Promise<boolean>
): CommandMiddleware {
  return async (command, args, _context, next) => {
    // Skip confirmation if --yes flag is set
    if (args.yes || args.y) {
      return next();
    }

    // Check if command is destructive
    if (isDestructive(command)) {
      const fullName = command.namespace
        ? `${command.namespace}:${command.name}`
        : command.name;

      const confirmed = await confirm(
        `Are you sure you want to execute '${fullName}'? This action may be destructive.`
      );

      if (!confirmed) {
        return {
          success: false,
          message: 'Command cancelled by user',
        };
      }
    }

    return next();
  };
}

/**
 * Rate limiting middleware
 *
 * Prevents command from being executed too frequently
 */
export function rateLimitMiddleware(
  maxExecutions: number,
  windowMs: number
): CommandMiddleware {
  const executions = new Map<string, number[]>();

  return async (command, _args, _context, next) => {
    const key = command.namespace
      ? `${command.namespace}:${command.name}`
      : command.name;

    const now = Date.now();
    const timestamps = executions.get(key) || [];

    // Remove timestamps outside the window
    const recentTimestamps = timestamps.filter(
      (ts) => now - ts < windowMs
    );

    // Check if rate limit exceeded
    if (recentTimestamps.length >= maxExecutions) {
      const oldestTimestamp = recentTimestamps[0] || now;
      const resetTime = oldestTimestamp + windowMs;
      const waitSeconds = Math.ceil((resetTime - now) / 1000);

      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${waitSeconds} seconds before running this command again.`,
      };
    }

    // Record execution
    recentTimestamps.push(now);
    executions.set(key, recentTimestamps);

    return next();
  };
}

/**
 * Create default middleware stack
 *
 * Returns commonly used middleware in recommended order
 */
export function createDefaultMiddleware(options?: {
  verbose?: boolean;
  telemetry?: (
    command: Command,
    args: CommandArgs,
    result: CommandResult,
    duration: number
  ) => void;
  confirm?: (message: string) => Promise<boolean>;
  isDestructive?: (command: Command) => boolean;
}): CommandMiddleware[] {
  const middleware: CommandMiddleware[] = [];

  // 1. Logging (first to capture everything)
  middleware.push(loggingMiddleware(options?.verbose));

  // 2. Error handling (wrap everything)
  middleware.push(errorHandlingMiddleware());

  // 3. Dry-run check
  middleware.push(dryRunMiddleware());

  // 4. Authentication
  middleware.push(authMiddleware());

  // 5. Workspace validation
  middleware.push(workspaceMiddleware());

  // 6. Confirmation for destructive commands
  if (options?.confirm && options?.isDestructive) {
    middleware.push(
      confirmationMiddleware(options.isDestructive, options.confirm)
    );
  }

  // 7. Telemetry (last to capture final result)
  if (options?.telemetry) {
    middleware.push(telemetryMiddleware(options.telemetry));
  }

  return middleware;
}
