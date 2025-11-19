# Command Router and Registry

The router layer provides command management, routing, and execution for the Nexus CLI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Command Router Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐         ┌──────────────────┐         │
│  │ CommandRegistry   │────────▶│ CommandRouter    │         │
│  │                   │         │                  │         │
│  │ - Static Commands │         │ - Route Commands │         │
│  │ - Dynamic Sources │         │ - Validation     │         │
│  │ - Search/Lookup   │         │ - Middleware     │         │
│  └───────────────────┘         └──────────────────┘         │
│           │                             │                    │
│           ▼                             ▼                    │
│  ┌───────────────────┐         ┌──────────────────┐         │
│  │ Dynamic Sources   │         │ Middleware Chain │         │
│  │                   │         │                  │         │
│  │ - Services        │         │ - Auth Check     │         │
│  │ - MCP Tools       │         │ - Logging        │         │
│  │ - Plugins         │         │ - Error Handling │         │
│  └───────────────────┘         └──────────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### CommandRegistry

Central registry for all CLI commands with support for:
- Static command registration
- Dynamic command discovery (services, MCP tools, plugins)
- Namespace-based organization
- Command search and lookup
- Validation

**Key Features:**
- Commands organized by namespace (e.g., `services:health`, `graphrag:query`)
- Dynamic sources can register commands at runtime
- Search by name, description, or namespace
- Command aliases support

### CommandRouter

Routes commands to handlers with intelligent resolution and middleware support.

**Key Features:**
- Multiple resolution strategies (direct, namespace, aliases)
- Argument validation before execution
- Middleware chain execution
- Error handling and reporting
- Performance tracking

### Middleware

Built-in middleware for common cross-cutting concerns:
- Authentication checks
- Workspace validation
- Logging and telemetry
- Error handling
- Dry-run mode
- Confirmation prompts
- Rate limiting

## Usage

### Basic Setup

```typescript
import {
  createCommandRegistry,
  createCommandRouter,
  createDefaultMiddleware,
} from './core/router/index.js';

// Create registry
const registry = createCommandRegistry();

// Register commands
registry.register({
  name: 'health',
  namespace: 'services',
  description: 'Check service health',
  handler: async (args, context) => {
    // Implementation
    return { success: true, message: 'All services healthy' };
  },
});

// Create router
const router = createCommandRouter(registry);

// Add middleware
const middleware = createDefaultMiddleware({ verbose: true });
middleware.forEach((m) => router.use(m));

// Route command
const result = await router.route('services:health', {}, context);
```

### Registering Static Commands

```typescript
import { Command } from '@nexus-cli/types';

const command: Command = {
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
  ],
  handler: async (args, context) => {
    const query = args._[0];
    const limit = args.limit || 10;

    // Query implementation
    return {
      success: true,
      data: { results: [] },
    };
  },
  examples: [
    'nexus graphrag:query "What is the architecture?"',
    'nexus graphrag:query "Find errors" --limit 5',
  ],
});

registry.register(command);
```

### Dynamic Command Sources

Dynamic sources discover commands at runtime from services, MCP tools, or plugins:

```typescript
import { DynamicCommandSource } from '@nexus-cli/types';

const serviceSource: DynamicCommandSource = {
  namespace: 'services',

  async discover() {
    // Discover services and create commands
    const services = await discoverServices();

    return services.map((service) => ({
      name: `${service.name}:health`,
      namespace: 'services',
      description: `Check ${service.name} health`,
      handler: async (args, context) => {
        const response = await fetch(`${service.url}/health`);
        return { success: response.ok };
      },
    }));
  },

  async refresh() {
    // Re-discover services (e.g., when services change)
    await discoverServices();
  },
};

// Register dynamic source
registry.registerDynamicSource(serviceSource);

// Discover commands
await registry.discoverDynamicCommands();
```

### Custom Middleware

```typescript
import { CommandMiddleware } from './core/router/index.js';

// Custom middleware for timing
const timingMiddleware: CommandMiddleware = async (
  command,
  args,
  context,
  next
) => {
  console.time(`Command: ${command.name}`);

  const result = await next();

  console.timeEnd(`Command: ${command.name}`);

  return result;
};

router.use(timingMiddleware);
```

### Command Validation

```typescript
import { CommandValidator } from '@nexus-cli/types';

const validator: CommandValidator = async (args, context) => {
  const errors = [];

  // Validate query argument
  if (!args._[0]) {
    errors.push({
      field: 'query',
      message: 'Query is required',
    });
  }

  // Validate limit option
  if (args.limit && args.limit < 1) {
    errors.push({
      field: 'limit',
      message: 'Limit must be at least 1',
      value: args.limit,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const command: Command = {
  name: 'query',
  namespace: 'graphrag',
  description: 'Query GraphRAG',
  validator,
  handler: async (args, context) => {
    // Handler implementation
  },
};
```

## Command Resolution Strategies

The router uses multiple strategies to find commands (in order):

1. **Direct Lookup**: Exact match on command name
   ```bash
   nexus help
   ```

2. **Namespace Prefix**: Full namespace:command format
   ```bash
   nexus services:health
   nexus graphrag:query
   ```

3. **Common Namespaces**: Try common namespaces automatically
   ```bash
   nexus health  # Tries services:health, graphrag:health, etc.
   ```

4. **Aliases**: Match against registered aliases
   ```bash
   nexus gq  # Alias for graphrag:query
   ```

## Middleware Order

Middleware is executed in the order it's registered. Recommended order:

1. **Logging** - Capture start of execution
2. **Error Handling** - Wrap everything in try-catch
3. **Dry-Run** - Check if this is a dry run
4. **Authentication** - Verify user is authenticated
5. **Workspace** - Verify workspace requirements
6. **Confirmation** - Ask for confirmation if destructive
7. **Telemetry** - Track usage (last to capture result)

The `createDefaultMiddleware()` function follows this order.

## Error Handling

Commands should return errors in a consistent format:

```typescript
// Success
return {
  success: true,
  data: { result: 'data' },
  message: 'Operation completed successfully',
};

// Error
return {
  success: false,
  error: 'Something went wrong',
  metadata: {
    service: 'graphrag',
    error: {
      name: 'ValidationError',
      code: 'INVALID_QUERY',
    },
  },
};
```

Middleware can catch exceptions and format them:

```typescript
try {
  return await next();
} catch (error: any) {
  return {
    success: false,
    error: error.message,
    metadata: {
      error: {
        name: error.name,
        stack: error.stack,
      },
    },
  };
}
```

## Integration with Commander.js

The router integrates with Commander.js for CLI parsing:

```typescript
import { Command as CommanderCommand } from 'commander';

// For each registered command
const commands = registry.list();
for (const cmd of commands) {
  const program = new CommanderCommand(cmd.name);

  // Add description
  program.description(cmd.description);

  // Add arguments
  if (cmd.args) {
    for (const arg of cmd.args) {
      const argStr = arg.required
        ? `<${arg.name}>`
        : `[${arg.name}]`;
      program.argument(argStr, arg.description);
    }
  }

  // Add options
  if (cmd.options) {
    for (const opt of cmd.options) {
      const flags = opt.short
        ? `-${opt.short}, --${opt.long}`
        : `--${opt.long}`;
      program.option(flags, opt.description, opt.default);
    }
  }

  // Set action
  program.action(async (...args) => {
    const result = await router.route(cmd.name, parseArgs(args), context);
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
  });
}
```

## Best Practices

1. **Use Namespaces**: Organize commands by service or feature
   ```typescript
   { name: 'health', namespace: 'services' }
   { name: 'query', namespace: 'graphrag' }
   ```

2. **Validate Arguments**: Use validators for complex validation
   ```typescript
   validator: async (args, context) => {
     // Validation logic
   }
   ```

3. **Handle Errors Gracefully**: Return structured errors
   ```typescript
   return { success: false, error: 'Clear error message' };
   ```

4. **Use Middleware**: Keep cross-cutting concerns in middleware
   ```typescript
   router.use(authMiddleware());
   router.use(loggingMiddleware());
   ```

5. **Document Commands**: Add examples and usage text
   ```typescript
   {
     usage: 'nexus graphrag:query <query> [options]',
     examples: [
       'nexus graphrag:query "What is the architecture?"',
       'nexus graphrag:query "Find errors" --limit 5',
     ],
   }
   ```

## Testing

```typescript
import { createCommandRegistry, createCommandRouter } from './router/index.js';

describe('CommandRouter', () => {
  let registry: CommandRegistry;
  let router: CommandRouter;

  beforeEach(() => {
    registry = createCommandRegistry();
    router = createCommandRouter(registry);
  });

  it('should route command successfully', async () => {
    // Register test command
    registry.register({
      name: 'test',
      description: 'Test command',
      handler: async () => ({ success: true, data: 'test' }),
    });

    // Route command
    const result = await router.route('test', {}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
  });

  it('should validate arguments', async () => {
    // Register command with validator
    registry.register({
      name: 'test',
      description: 'Test command',
      validator: async (args) => ({
        valid: args.required !== undefined,
        errors: args.required ? [] : [{ field: 'required', message: 'Required' }],
      }),
      handler: async () => ({ success: true }),
    });

    // Route without required arg
    const result = await router.route('test', {}, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed');
  });
});
```

## Migration from Old CLI

Key changes from the original Nexus CLI:

1. **Removed "Brain" terminology** - All references removed
2. **Added middleware support** - Cleaner cross-cutting concerns
3. **Improved error handling** - Structured error format
4. **Better validation** - Consistent validation pattern
5. **Enhanced discovery** - Support for services and MCP tools
6. **TypeScript imports** - Use .js extensions for ESM compatibility

## Files

- `command-registry.ts` - Command registration and lookup
- `command-router.ts` - Command routing and execution
- `middleware.ts` - Built-in middleware functions
- `index.ts` - Public API exports
- `README.md` - This documentation
