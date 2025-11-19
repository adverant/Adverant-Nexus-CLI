# @nexus-cli/sdk

> Software Development Kit for building Nexus CLI plugins and extensions

[![Version](https://img.shields.io/npm/v/@nexus-cli/sdk.svg)](https://www.npmjs.com/package/@nexus-cli/sdk)
[![License](https://img.shields.io/npm/l/@nexus-cli/sdk.svg)](https://github.com/adverant/nexus-cli/blob/main/LICENSE)

## Overview

The Nexus CLI SDK provides a comprehensive toolkit for developing plugins and extensions that integrate seamlessly with the Nexus CLI ecosystem.

## Installation

```bash
npm install @nexus-cli/sdk
```

## Quick Start

### Create a Plugin

```typescript
import { PluginBuilder } from '@nexus-cli/sdk';

export default PluginBuilder
  .create('my-plugin')
  .version('1.0.0')
  .description('My custom Nexus plugin')

  .command('greet', {
    description: 'Greet the user',
    args: [
      { name: 'name', type: 'string', required: true, description: 'Name to greet' }
    ],
    handler: async (args, context) => {
      const { name } = args;
      context.log.info(`Hello, ${name}!`);

      return {
        success: true,
        message: `Greeted ${name}`
      };
    }
  })

  .build();
```

### Access Nexus Services

```typescript
.command('analyze', {
  description: 'Analyze data with GraphRAG',
  handler: async (args, context) => {
    // Access Nexus services through context
    const result = await context.services.graphrag.query({
      text: 'analyze user behavior patterns',
      limit: 10
    });

    return { success: true, data: result };
  }
})
```

### Use Built-in Utilities

```typescript
import {
  Logger,
  FileSystem,
  HttpClient,
  ConfigManager
} from '@nexus-cli/sdk';

// Logging
const logger = new Logger('my-plugin');
logger.info('Plugin initialized');

// File operations
const fs = new FileSystem();
await fs.readJSON('./config.json');

// HTTP requests
const http = new HttpClient();
const data = await http.get('/api/data');

// Configuration
const config = new ConfigManager();
const apiKey = config.get('my-plugin.apiKey');
```

## Plugin Structure

```
my-plugin/
├── plugin.json          # Plugin manifest
├── src/
│   ├── index.ts        # Main entry (exports PluginBuilder)
│   ├── commands/       # Command implementations
│   │   ├── analyze.ts
│   │   └── report.ts
│   └── utils/          # Utilities
├── package.json
├── tsconfig.json
└── README.md
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "author": "Your Name",
  "main": "dist/index.js",
  "permissions": [
    "services:graphrag",
    "filesystem:read",
    "network:http"
  ],
  "dependencies": {
    "@nexus-cli/sdk": "^1.0.0"
  }
}
```

## API Reference

### PluginBuilder

```typescript
PluginBuilder
  .create(name: string)
  .version(version: string)
  .description(description: string)
  .command(name: string, config: CommandConfig)
  .hook(event: string, handler: Function)
  .permission(permission: string)
  .build()
```

### Plugin Context

Available in command handlers:

```typescript
interface PluginContext {
  // Service access
  services: {
    graphrag: GraphRAGClient;
    mageagent: MageAgentClient;
    auth: AuthClient;
    // ... all Nexus services
  };

  // Utilities
  log: Logger;
  fs: FileSystem;
  http: HttpClient;
  config: ConfigManager;

  // Plugin metadata
  plugin: PluginMetadata;

  // CLI state
  session: Session;
  workspace: Workspace;
}
```

### Hooks

Register lifecycle hooks:

```typescript
.hook('beforeCommand', async (context) => {
  context.log.debug('Command starting');
})

.hook('afterCommand', async (context, result) => {
  context.log.info(`Command completed: ${result.success}`);
})

.hook('onError', async (context, error) => {
  context.log.error('Command failed', error);
})
```

## Permissions

Request permissions in your plugin:

```typescript
.permission('services:graphrag')       // Access GraphRAG service
.permission('filesystem:read')         // Read files
.permission('filesystem:write')        // Write files
.permission('network:http')            // Make HTTP requests
.permission('network:websocket')       // WebSocket connections
.permission('process:execute')         // Execute processes
```

## Testing

```bash
# Install dev dependencies
npm install --save-dev @nexus-cli/sdk @types/node

# Run tests
npm test

# Test plugin locally
nexus plugin install ./my-plugin
nexus my-plugin greet "World"
```

## Publishing

```bash
# Build plugin
npm run build

# Publish to npm
npm publish

# Install published plugin
nexus plugin install my-plugin
```

## Examples

See the [examples directory](../../docs/examples/) for complete plugin examples.

## Development

```bash
# Build SDK
npm run build

# Run type checking
npm run typecheck

# Run tests
npm test
```

## Documentation

- [Plugin Development Guide](../../docs/guides/plugin-development.md)
- [API Reference](../../docs/api/)
- [Examples](../../docs/examples/)

## License

MIT © Adverant AI
