# @nexus-cli/types

> Shared TypeScript types and interfaces for Nexus CLI

[![Version](https://img.shields.io/npm/v/@nexus-cli/types.svg)](https://www.npmjs.com/package/@nexus-cli/types)
[![License](https://img.shields.io/npm/l/@nexus-cli/types.svg)](https://github.com/adverant/nexus-cli/blob/main/LICENSE)

## Overview

This package provides shared TypeScript types, interfaces, and Zod schemas used across the Nexus CLI ecosystem. It ensures type safety and runtime validation throughout the codebase.

## Installation

```bash
npm install @nexus-cli/types
```

## Features

- 📝 **Comprehensive type definitions** for all Nexus services and APIs
- ✅ **Zod schemas** for runtime validation with type inference
- 🔄 **Single source of truth** - types derived from schemas using `z.infer<>`
- 🛡️ **Type-safe** configuration and session management
- 🔌 **Plugin and MCP** type definitions

## Usage

### Import Types

```typescript
import type {
  ServiceMetadata,
  ServiceStatus,
  NexusConfig,
  Session,
  PortMapping
} from '@nexus-cli/types';
```

### Use Zod Schemas

```typescript
import { NexusConfigSchema, SessionSchema } from '@nexus-cli/types';

// Runtime validation
const config = NexusConfigSchema.parse(userInput);

// Type inference from schema
type Config = z.infer<typeof NexusConfigSchema>;
```

## Available Types

### Configuration Types
- `NexusConfig` - Global configuration structure
- `WorkspaceConfig` - Workspace-specific configuration
- `ServicesConfig` - Services configuration
- `AuthConfig` - Authentication configuration
- `PluginsConfig` - Plugin configuration
- `MCPConfig` - MCP server configuration

### Service Types
- `ServiceMetadata` - Complete service information
- `ServiceStatus` - Service status enum
- `ServiceCapability` - Service capability description
- `PortMapping` - Port mapping configuration
- `DockerComposeConfig` - Docker Compose structure

### Session Types
- `Session` - Session state and metadata
- `SessionContext` - Session execution context
- `HistoryEntry` - Command history entry
- `SessionResult` - Session execution result

### Plugin Types
- `PluginMetadata` - Plugin manifest
- `PluginCommand` - Plugin command definition
- `PluginContext` - Plugin execution context

## Zod Schemas

All configuration and session types have corresponding Zod schemas in:
- `config-schemas.ts` - Configuration validation schemas
- `session-schemas.ts` - Session validation schemas

## Development

```bash
# Build package
npm run build

# Run type checking
npm run typecheck

# Run tests
npm test
```

## Documentation

See the [main documentation](../../docs/) for detailed type reference.

## License

MIT © Adverant AI
