# Migration Guide: Old CLI to New Router

This guide helps migrate from the old Nexus CLI router to the new implementation.

## Key Changes

### 1. Removed "Brain" Terminology

All references to "Brain" have been removed from the codebase.

**Old:**
```typescript
// Brain-specific commands
registry.register({
  name: 'query',
  namespace: 'brain',
  // ...
});
```

**New:**
```typescript
// Use service-specific namespaces
registry.register({
  name: 'query',
  namespace: 'graphrag', // or 'mageagent', 'services', etc.
  // ...
});
```

### 2. Enhanced Middleware Support

The new router has a complete middleware system with built-in middleware functions.

**Old:**
```typescript
// No middleware support - concerns mixed in router
router.route(command, args, context);
```

**New:**
```typescript
import { createDefaultMiddleware } from './router/index.js';

const router = createCommandRouter(registry);

// Add middleware
const middleware = createDefaultMiddleware({
  verbose: true,
  telemetry: (cmd, args, result, duration) => {
    // Track metrics
  },
});

middleware.forEach((m) => router.use(m));
```

### 3. Improved Dynamic Command Discovery

Dynamic sources are now more powerful and flexible.

**Old:**
```typescript
// Limited dynamic source support
interface DynamicCommandSource {
  namespace: string;
  discover(): Promise<Command[]>;
  refresh(): Promise<void>;
}
```

**New:**
```typescript
// Same interface, better implementation
const serviceSource: DynamicCommandSource = {
  namespace: 'services',

  async discover() {
    // Discover from multiple sources:
    // - Service discovery
    // - MCP tools
    // - Plugins
    const services = await discoverServices();
    return services.map(createCommandForService);
  },

  async refresh() {
    // Re-discover with better error handling
    await refreshServiceRegistry();
  },
};

registry.registerDynamicSource(serviceSource);
await registry.discoverDynamicCommands();
```

### 4. Better Command Resolution

More intelligent command resolution with multiple strategies.

**Old:**
```typescript
// Basic resolution
const command = registry.get(name, namespace);
```

**New:**
```typescript
// Multiple resolution strategies:
// 1. Direct lookup
// 2. Namespace prefix (services:health)
// 3. Common namespaces (auto-try services, graphrag, etc.)
// 4. Aliases
const result = await router.route('health', args, context);
// Finds 'services:health' automatically
```

### 5. Validation Improvements

More structured validation with better error messages.

**Old:**
```typescript
validator: async (args, context) => {
  if (!args.query) {
    throw new Error('Query required');
  }
};
```

**New:**
```typescript
validator: async (args, context) => {
  const errors = [];

  if (!args._[0]) {
    errors.push({
      field: 'query',
      message: 'Query is required',
    });
  }

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
```

### 6. Error Handling

Consistent error format across all commands.

**Old:**
```typescript
// Inconsistent error handling
throw new Error('Something failed');
```

**New:**
```typescript
// Structured error results
return {
  success: false,
  error: 'Clear error message',
  metadata: {
    service: 'graphrag',
    error: {
      name: 'ValidationError',
      code: 'INVALID_QUERY',
    },
  },
};
```

### 7. TypeScript Improvements

Better type safety with imports from `@nexus-cli/types`.

**Old:**
```typescript
import type { Command } from '../../types/command.js';
```

**New:**
```typescript
import type { Command } from '@nexus-cli/types';
```

### 8. ESM Compatibility

All imports use `.js` extensions for ESM compatibility.

**Old:**
```typescript
import { CommandRegistry } from './command-registry';
```

**New:**
```typescript
import { CommandRegistry } from './command-registry.js';
```

## Migration Steps

### Step 1: Update Imports

```typescript
// Old
import {
  CommandRegistry,
  CommandRouter,
} from './core/router';

// New
import {
  createCommandRegistry,
  createCommandRouter,
  createDefaultMiddleware,
} from './core/router/index.js';
```

### Step 2: Update Command Registration

```typescript
// Old
const registry = new CommandRegistry();
registry.register({
  name: 'query',
  namespace: 'brain', // ❌ Old terminology
  // ...
});

// New
const registry = createCommandRegistry();
registry.register({
  name: 'query',
  namespace: 'graphrag', // ✅ Service-specific
  // ...
});
```

### Step 3: Add Middleware

```typescript
// Old - no middleware
const router = new CommandRouter(registry);

// New - with middleware
const router = createCommandRouter(registry);

// Add authentication middleware
router.use(authMiddleware());

// Add logging middleware
router.use(loggingMiddleware(true));

// Or use default stack
const middleware = createDefaultMiddleware({ verbose: true });
middleware.forEach((m) => router.use(m));
```

### Step 4: Update Command Handlers

```typescript
// Old
handler: async (args, context) => {
  // Throw errors
  if (!args.query) {
    throw new Error('Query required');
  }

  return { success: true, data: result };
};

// New
handler: async (args, context) => {
  // Return structured errors
  if (!args._[0]) {
    return {
      success: false,
      error: 'Query is required',
    };
  }

  return {
    success: true,
    data: result,
    message: 'Query executed successfully',
  };
};
```

### Step 5: Update Dynamic Sources

```typescript
// Old
const source: DynamicCommandSource = {
  namespace: 'brain',
  discover: async () => {
    // Basic discovery
  },
  refresh: async () => {
    // Basic refresh
  },
};

// New
const source: DynamicCommandSource = {
  namespace: 'services', // Service-specific namespace

  async discover() {
    try {
      const services = await discoverServices();
      return services.map((service) => ({
        name: service.name,
        namespace: 'services',
        description: `${service.name} service commands`,
        handler: async (args, context) => {
          // Service-specific logic
        },
      }));
    } catch (error) {
      console.error('Service discovery failed:', error);
      return [];
    }
  },

  async refresh() {
    // Re-discover with proper error handling
    await refreshServiceRegistry();
  },
};

registry.registerDynamicSource(source);
```

### Step 6: Integrate with Commander.js

```typescript
// New helper for Commander.js integration
import { createCommanderProgram } from './router/examples/commander-integration.js';

const program = createCommanderProgram(registry, router, context);
await program.parseAsync(process.argv);
```

## Breaking Changes

### 1. Factory Functions

Use factory functions instead of direct instantiation:

```typescript
// ❌ Old
const registry = new CommandRegistry();
const router = new CommandRouter(registry);

// ✅ New
const registry = createCommandRegistry();
const router = createCommandRouter(registry);
```

### 2. Error Format

Errors must be returned, not thrown:

```typescript
// ❌ Old
throw new Error('Something failed');

// ✅ New
return {
  success: false,
  error: 'Something failed',
};
```

### 3. Validation Format

Validators return structured validation results:

```typescript
// ❌ Old
if (!valid) {
  throw new Error('Invalid');
}

// ✅ New
return {
  valid: false,
  errors: [{ field: 'query', message: 'Invalid' }],
};
```

## New Features

### 1. Middleware System

```typescript
// Authentication
router.use(authMiddleware());

// Logging
router.use(loggingMiddleware(verbose));

// Error handling
router.use(errorHandlingMiddleware());

// Custom middleware
router.use(async (command, args, context, next) => {
  console.log(`Executing: ${command.name}`);
  const result = await next();
  console.log(`Completed: ${command.name}`);
  return result;
});
```

### 2. Command Search

```typescript
// Search by keyword
const commands = registry.search('health');

// Get by category
const categories = registry.getByCategory();

// Get statistics
const stats = registry.getStats();
```

### 3. Validation Helpers

```typescript
const validation = router.validateCommand('services:health', context);

if (!validation.valid) {
  console.error(validation.error);
}
```

### 4. Help Generation

```typescript
const help = router.getCommandHelp('services:health');
console.log(help);
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createCommandRegistry, createCommandRouter } from './router/index.js';

describe('CommandRouter', () => {
  it('should route commands', async () => {
    const registry = createCommandRegistry();
    const router = createCommandRouter(registry);

    registry.register({
      name: 'test',
      description: 'Test',
      handler: async () => ({ success: true }),
    });

    const result = await router.route('test', { _: [] }, mockContext);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('CLI Integration', () => {
  it('should execute commands via Commander', async () => {
    const registry = createCommandRegistry();
    const router = createCommandRouter(registry);

    registerCommands(registry);

    const program = createCommanderProgram(registry, router, context);

    // Test command execution
    await program.parseAsync(['node', 'cli', 'services', 'health']);
  });
});
```

## Common Patterns

### 1. Service Commands

```typescript
registry.register({
  name: 'health',
  namespace: 'services',
  description: 'Check service health',
  handler: async (args, context) => {
    const services = Array.from(context.services.values());
    return {
      success: true,
      data: services.map((s) => ({ name: s.name, status: 'healthy' })),
    };
  },
});
```

### 2. GraphRAG Commands

```typescript
registry.register({
  name: 'query',
  namespace: 'graphrag',
  description: 'Query GraphRAG',
  args: [
    {
      name: 'query',
      description: 'Query string',
      required: true,
      type: 'string',
    },
  ],
  handler: async (args, context) => {
    const query = args._[0];
    const results = await queryGraphRAG(query);
    return { success: true, data: results };
  },
});
```

### 3. MageAgent Commands

```typescript
registry.register({
  name: 'run',
  namespace: 'mageagent',
  description: 'Run task',
  handler: async (args, context) => {
    const task = args._[0];
    const result = await runMageAgentTask(task);
    return { success: true, data: result };
  },
});
```

## Support

For questions or issues:
1. Check the README.md for detailed documentation
2. Review the examples in `examples/`
3. Run the test suite: `npm test`
4. Check existing commands in the registry

## Resources

- [README.md](./README.md) - Complete documentation
- [examples/basic-usage.ts](./examples/basic-usage.ts) - Basic usage patterns
- [examples/commander-integration.ts](./examples/commander-integration.ts) - Commander.js integration
- [__tests__/command-router.test.ts](./__tests__/command-router.test.ts) - Test examples
