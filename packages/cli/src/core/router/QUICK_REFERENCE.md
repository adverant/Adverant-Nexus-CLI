# Command Router Quick Reference

## Installation

```bash
# No installation needed - part of @nexus-cli/cli package
import { createCommandRegistry, createCommandRouter } from './core/router/index.js';
```

## Basic Setup

```typescript
import {
  createCommandRegistry,
  createCommandRouter,
  createDefaultMiddleware,
} from './core/router/index.js';

// 1. Create instances
const registry = createCommandRegistry();
const router = createCommandRouter(registry);

// 2. Add middleware (optional)
const middleware = createDefaultMiddleware({ verbose: true });
middleware.forEach((m) => router.use(m));

// 3. Register commands
registry.register({
  name: 'hello',
  description: 'Say hello',
  handler: async () => ({ success: true, message: 'Hello!' }),
});

// 4. Execute
const result = await router.route('hello', { _: [] }, context);
```

## Common Operations

### Register a Command

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
    const limit = args.limit;
    // Implementation
    return { success: true, data: results };
  },
  examples: ['nexus graphrag:query "search term" --limit 5'],
});
```

### Dynamic Commands

```typescript
const source: DynamicCommandSource = {
  namespace: 'services',
  discover: async () => {
    const services = await discoverServices();
    return services.map((s) => ({
      name: s.name,
      namespace: 'services',
      description: `${s.name} commands`,
      handler: async () => ({ success: true }),
    }));
  },
  refresh: async () => {
    await refreshServices();
  },
};

registry.registerDynamicSource(source);
await registry.discoverDynamicCommands();
```

### Add Middleware

```typescript
// Built-in middleware
import { authMiddleware, loggingMiddleware } from './router/index.js';

router.use(authMiddleware());
router.use(loggingMiddleware(true));

// Custom middleware
router.use(async (command, args, context, next) => {
  console.log(`Running: ${command.name}`);
  const result = await next();
  console.log(`Done: ${command.name}`);
  return result;
});
```

### Route Commands

```typescript
// Simple routing
const result = await router.route('help', { _: [] }, context);

// With arguments
const result = await router.route('query', { _: ['search'], limit: 10 }, context);

// With namespace
const result = await router.route('services:health', {}, context);
```

### Validate Commands

```typescript
const validation = router.validateCommand('services:health', context);

if (!validation.valid) {
  console.error(validation.error);
  process.exit(1);
}
```

### Search Commands

```typescript
// Search by keyword
const commands = registry.search('health');

// Get all commands
const all = registry.list();

// Get by namespace
const serviceCommands = registry.list('services');

// Get namespaces
const namespaces = registry.listNamespaces();
```

## Command Structure

```typescript
interface Command {
  // Required
  name: string;
  description: string;
  handler: CommandHandler;

  // Optional
  namespace?: string;
  aliases?: string[];
  args?: ArgumentDefinition[];
  options?: OptionDefinition[];
  validator?: CommandValidator;
  examples?: string[];
  usage?: string;
  category?: string;
  hidden?: boolean;
  streaming?: boolean;
  requiresAuth?: boolean;
  requiresWorkspace?: boolean;
}
```

## Argument Types

```typescript
type ArgumentType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'file'
  | 'directory'
  | 'url'
  | 'json';
```

## Result Format

```typescript
// Success
return {
  success: true,
  data: { /* result data */ },
  message: 'Optional success message',
};

// Error
return {
  success: false,
  error: 'Error message',
  metadata: {
    service: 'graphrag',
    error: { code: 'ERR_CODE' },
  },
};
```

## Validation

```typescript
validator: async (args, context) => {
  const errors = [];

  if (!args._[0]) {
    errors.push({
      field: 'query',
      message: 'Query is required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Context Structure

```typescript
const context: CommandContext = {
  cwd: process.cwd(),
  config: {}, // User config
  workspace: { root: '/path', type: 'typescript', git: true },
  services: new Map([
    ['graphrag', { name: 'graphrag', url: 'http://localhost:9000' }],
  ]),
  verbose: false,
  quiet: false,
  outputFormat: 'text',
  transport: null,
};
```

## Built-in Middleware

```typescript
import {
  authMiddleware,           // Check authentication
  workspaceMiddleware,      // Check workspace
  loggingMiddleware,        // Log execution
  errorHandlingMiddleware,  // Handle errors
  telemetryMiddleware,      // Track metrics
  dryRunMiddleware,         // Dry-run mode
  confirmationMiddleware,   // Confirm destructive ops
  rateLimitMiddleware,      // Rate limiting
  createDefaultMiddleware,  // Default stack
} from './router/index.js';
```

## Commander.js Integration

```typescript
import { createCommanderProgram } from './router/examples/commander-integration.js';

const program = createCommanderProgram(registry, router, context);
await program.parseAsync(process.argv);
```

## Common Patterns

### Service Health Check

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

### Query Command

```typescript
registry.register({
  name: 'query',
  namespace: 'graphrag',
  description: 'Query GraphRAG',
  args: [{ name: 'query', required: true, type: 'string', description: 'Query' }],
  handler: async (args) => {
    const results = await queryGraphRAG(args._[0]);
    return { success: true, data: results };
  },
});
```

### Interactive Command

```typescript
registry.register({
  name: 'run',
  namespace: 'mageagent',
  description: 'Run task',
  options: [
    { long: 'interactive', short: 'i', type: 'boolean', description: 'Interactive' },
  ],
  handler: async (args) => {
    const task = args._[0];
    const interactive = args.interactive || false;
    const result = await runTask(task, { interactive });
    return { success: true, data: result };
  },
});
```

## Error Handling

```typescript
// In handler
handler: async (args, context) => {
  try {
    const result = await doSomething();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      metadata: { error: { name: error.name } },
    };
  }
}

// Or use error handling middleware
router.use(errorHandlingMiddleware());
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createCommandRegistry, createCommandRouter } from './router/index.js';

describe('My Command', () => {
  it('should execute successfully', async () => {
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

## Tips

1. **Use namespaces** for organization: `services:health`, `graphrag:query`
2. **Add examples** to help users understand command usage
3. **Validate inputs** before processing
4. **Return structured errors** for better UX
5. **Use middleware** for cross-cutting concerns
6. **Test commands** with unit tests
7. **Document commands** with clear descriptions

## References

- [README.md](./README.md) - Full documentation
- [MIGRATION.md](./MIGRATION.md) - Migration guide
- [examples/](./examples/) - Code examples
- [__tests__/](./__tests__/) - Test examples
