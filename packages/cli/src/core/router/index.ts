/**
 * Router Layer Index
 *
 * Exports command router and registry components for the Nexus CLI
 *
 * The router layer provides:
 * - Command registration and management (CommandRegistry)
 * - Command routing and execution (CommandRouter)
 * - Dynamic command discovery from services and MCP tools
 * - Middleware support for cross-cutting concerns
 * - Validation and error handling
 */

// Registry exports
export {
  CommandRegistry,
  createCommandRegistry,
} from './command-registry.js';

// Router exports
export {
  CommandRouter,
  createCommandRouter,
  type CommandMiddleware,
} from './command-router.js';

// Middleware exports
export {
  authMiddleware,
  workspaceMiddleware,
  loggingMiddleware,
  errorHandlingMiddleware,
  telemetryMiddleware,
  dryRunMiddleware,
  confirmationMiddleware,
  rateLimitMiddleware,
  createDefaultMiddleware,
} from './middleware.js';

// Type re-exports from @adverant-nexus/types
export type {
  Command,
  CommandHandler,
  CommandContext,
  CommandResult,
  CommandArgs,
  CommandValidator,
  ValidationResult,
  ValidationError,
  DynamicCommandSource,
  ArgumentDefinition,
  OptionDefinition,
  ArgumentType,
  WorkspaceInfo,
} from '@adverant-nexus/types';
