# Nexus CLI Architecture

## Overview

The Nexus CLI is a modular, auto-discovering command-line interface built with TypeScript and Node.js. It provides unified access to the Adverant-Nexus microservices ecosystem through an intelligent, extensible architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nexus CLI                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Interactive │  │   Scripting  │  │  Autonomous  │        │
│  │     REPL     │  │     Mode     │  │    Agent     │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│         ┌──────────────────▼──────────────────┐                │
│         │      Command Router                  │                │
│         │   (Auto-Discovery Engine)           │                │
│         └──────┬───────────────────┬──────────┘                │
│                │                   │                            │
│     ┌──────────▼─────┐  ┌─────────▼────────┐  ┌──────────┐   │
│     │   Service      │  │   MCP Tools      │  │  Plugin   │   │
│     │   Commands     │  │   (70+ tools)    │  │ Commands  │   │
│     └──────┬─────────┘  └─────────┬────────┘  └────┬─────┘   │
│            │                      │                  │          │
│     ┌──────▼──────────────────────▼──────────────────▼─────┐  │
│     │          Transport Layer                             │  │
│     │       (HTTP │ WebSocket │ MCP Protocol)             │  │
│     └──────┬──────────────────────────────────────────────┘  │
│            │                                                   │
└────────────┼───────────────────────────────────────────────────┘
             │
        ┌────▼────────────────────────────────────────┐
        │    Adverant-Nexus Microservices             │
        │  (GraphRAG │ MageAgent │ Auth │ Gateway)    │
        └─────────────────────────────────────────────┘
```

## Core Components

### 1. Command Router

The command router is the heart of the CLI, responsible for:

- **Auto-discovery**: Dynamically discovers services from docker-compose.yml and OpenAPI specs
- **Command registration**: Registers commands from services, MCP tools, and plugins
- **Routing**: Routes user commands to appropriate handlers
- **Alias resolution**: O(1) lookup for command aliases using Map-based index

**Location**: [packages/cli/src/core/router/](../../packages/cli/src/core/router/)

**Key files**:
- `command-registry.ts` - Command registration and lookup
- `command-router.ts` - Command execution and routing

### 2. Service Discovery

Automatically discovers and integrates services:

```
┌─────────────────────────────────────┐
│      Service Discovery              │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────┐  ┌────────────┐ │
│  │ Docker Parser │  │  OpenAPI   │ │
│  │  (Compose)    │  │  Parser    │ │
│  └───────┬───────┘  └──────┬─────┘ │
│          │                  │       │
│          └─────────┬────────┘       │
│                    │                │
│          ┌─────────▼─────────┐     │
│          │ Service Metadata  │     │
│          │     Loader        │     │
│          └─────────┬─────────┘     │
│                    │                │
│          ┌─────────▼─────────┐     │
│          │ Command Generator │     │
│          └───────────────────┘     │
└─────────────────────────────────────┘
```

**Location**: [packages/cli/src/core/discovery/](../../packages/cli/src/core/discovery/)

**Key files**:
- `docker-parser.ts` - Parse docker-compose files
- `service-metadata-loader.ts` - Load service metadata from config
- `openapi-parser.ts` - Parse OpenAPI specifications

**Service metadata** is externalized in [config/service-metadata.json](../../config/service-metadata.json)

### 3. Transport Layer

Handles communication with Nexus services:

```
┌────────────────────────────────┐
│      Transport Layer           │
├────────────────────────────────┤
│                                │
│  ┌────────────┐  ┌──────────┐ │
│  │   HTTP     │  │   WS     │ │
│  │  Client    │  │  Client  │ │
│  └─────┬──────┘  └─────┬────┘ │
│        │               │       │
│  ┌─────▼───────────────▼────┐ │
│  │   Connection Pool        │ │
│  └─────┬────────────────────┘ │
│        │                       │
│  ┌─────▼────────┐             │
│  │ MCP Client   │             │
│  │ (State       │             │
│  │  Machine)    │             │
│  └──────────────┘             │
└────────────────────────────────┘
```

**Location**: [packages/cli/src/core/transport/](../../packages/cli/src/core/transport/)

**Key files**:
- `http-client.ts` - HTTP/REST communication
- `websocket-client.ts` - WebSocket streaming
- `mcp-client.ts` - MCP protocol client with formal state machine

**MCP Client State Machine**:
```
DISCONNECTED ──connect()──> CONNECTING ──success──> CONNECTED
     ▲                           │                        │
     │                         fail                       │
     │                           │                        │
     │                           ▼                        │
     │                         ERROR                      │
     │                                                    │
     └──────────────────── disconnect() ◄────────────────┘
                              │
                              ▼
                        DISCONNECTING
```

### 4. Docker Integration

Async Docker operations for service management:

**Location**: [packages/cli/src/core/docker/](../../packages/cli/src/core/docker/)

**Key files**:
- `docker-executor.ts` - Async Docker command execution
- Error classification: NOT_FOUND, NOT_RUNNING, PERMISSION_DENIED, TIMEOUT, etc.

**Features**:
- Non-blocking async operations (replaces `execSync`)
- Typed error handling with 7 error types
- 10MB buffer for large outputs
- Configurable timeouts (default: 30s)
- Helper functions: `dockerInspect`, `isContainerRunning`, `startContainer`, etc.

### 5. Session Management

Manages CLI sessions and state:

```
┌────────────────────────────────┐
│    Session Management          │
├────────────────────────────────┤
│                                │
│  ┌────────────────────┐        │
│  │  Context Manager   │        │
│  │  - Environment     │        │
│  │  - Workspace       │        │
│  │  - History         │        │
│  └──────┬─────────────┘        │
│         │                      │
│  ┌──────▼─────────────┐        │
│  │  Session Storage   │        │
│  │  - Save/Load       │        │
│  │  - File security   │        │
│  └──────┬─────────────┘        │
│         │                      │
│  ┌──────▼─────────────┐        │
│  │  Env Sanitizer     │        │
│  │  - Allowlist       │        │
│  │  - Pattern block   │        │
│  └────────────────────┘        │
└────────────────────────────────┘
```

**Location**: [packages/cli/src/core/session/](../../packages/cli/src/core/session/)

**Key files**:
- `context-manager.ts` - Session context management
- `session-storage.ts` - Persistent session storage with 0600 permissions
- `env-sanitizer.ts` - Environment variable sanitization for security

**Security features**:
- Allowlist for safe environment variables
- Pattern blocking for sensitive data (password, token, key, etc.)
- File permissions enforcement (0600 - owner-only)
- Cross-platform compatibility

### 6. Plugin System

Extensible plugin architecture:

```
┌─────────────────────────────────┐
│       Plugin System             │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────┐       │
│  │  Plugin Loader       │       │
│  │  - Discovery         │       │
│  │  - Validation        │       │
│  │  - Registration      │       │
│  └──────┬───────────────┘       │
│         │                       │
│  ┌──────▼───────────────┐       │
│  │  Plugin Sandbox      │       │
│  │  - Permission check  │       │
│  │  - Resource limits   │       │
│  └──────┬───────────────┘       │
│         │                       │
│  ┌──────▼───────────────┐       │
│  │  Plugin Context      │       │
│  │  - Services access   │       │
│  │  - Utilities         │       │
│  └──────────────────────┘       │
└─────────────────────────────────┘
```

**SDK**: [@nexus-cli/sdk](../../packages/sdk/)

Plugins can:
- Register custom commands
- Access Nexus services
- Use built-in utilities (Logger, FileSystem, HttpClient)
- Hook into CLI lifecycle events
- Request granular permissions

### 7. Logging Framework

Centralized logging with multiple levels and outputs:

**Location**: [packages/cli/src/core/logging/](../../packages/cli/src/core/logging/)

**Key files**:
- `logger.ts` - Logger class with 6 levels (TRACE, DEBUG, INFO, WARN, ERROR, SILENT)

**Features**:
- Colored console output via chalk
- JSON output mode for machine parsing
- File logging with rotation support
- Context/metadata objects
- Error stack traces
- Performance timing utilities
- Child loggers with inherited context
- CLI flag integration (--verbose, --quiet, --debug, --log-file)

**Usage**:
```typescript
import { log } from './core/logging/index.js';

log.info('Operation started', { service: 'graphrag' });
log.warn('Connection slow', { latency: 500 });
log.error('Operation failed', error);
log.exception(error, 'Failed to connect', { host });
```

## Data Flow

### Command Execution Flow

```
User Input (CLI/REPL)
        │
        ▼
   Parse & Tokenize
        │
        ▼
   Command Router
        │
   ┌────┴────┬────────┬──────────┐
   │         │        │          │
   ▼         ▼        ▼          ▼
Service   Plugin   MCP Tool   Builtin
Command   Command   Handler   Command
   │         │        │          │
   └────┬────┴────────┴──────────┘
        │
        ▼
  Transport Layer
        │
   ┌────┴────┐
   │         │
   ▼         ▼
  HTTP      WS      MCP
        │
        ▼
  Nexus Services
        │
        ▼
   Format Output
        │
   ┌────┴────┬────────┬──────────┐
   │         │        │          │
   ▼         ▼        ▼          ▼
 Text      JSON    Table    Stream
        │
        ▼
  Display to User
```

### Service Discovery Flow

```
CLI Startup
     │
     ▼
Read Config
     │
     ▼
Parse docker-compose.yml
     │
     ▼
Load service-metadata.json
     │
     ▼
Extract Service Metadata
  - Name, ports, health
  - OpenAPI specs
  - Capabilities
     │
     ▼
Parse OpenAPI Specs
  - Endpoints
  - Parameters
  - Response schemas
     │
     ▼
Generate Commands
     │
     ▼
Register in Router
     │
     ▼
CLI Ready
```

## Configuration

### Configuration Files

1. **Global Config**: `~/.nexus/config.toml`
   - Services configuration (API URLs, timeouts)
   - Authentication settings
   - Default options
   - Plugin settings

2. **Workspace Config**: `.nexus.toml` (project root)
   - Project-specific settings
   - Agent configuration
   - Custom shortcuts
   - Workspace metadata

3. **Service Metadata**: `config/service-metadata.json`
   - Service display names
   - Service descriptions
   - OpenAPI availability flags
   - Infrastructure service markers

### Configuration Schema

Configurations are validated using **Zod schemas**:

**Location**: [packages/types/src/config-schemas.ts](../../packages/types/src/config-schemas.ts)

Benefits:
- Runtime validation
- Type inference (`z.infer<typeof Schema>`)
- Single source of truth for types and validation
- Automatic error messages

## Security

### Environment Sanitization

All session files use environment sanitization to prevent credential leakage:

**Allowlist approach**:
- Safe variables: PATH, HOME, USER, SHELL, etc.
- Safe prefixes: NEXUS_*, NODE_*, npm_*

**Blocklist patterns**:
- `/key/i`, `/secret/i`, `/token/i`, `/password/i`, `/credential/i`, `/auth/i`

**File security**:
- Session files: 0600 permissions (owner-only)
- Config files: 0600 permissions
- Plugin files: 0644 permissions (read-only for non-owners)

### Plugin Permissions

Plugins operate in a sandboxed environment with granular permissions:

- `services:<name>` - Access specific service
- `filesystem:read` - Read files
- `filesystem:write` - Write files
- `network:http` - HTTP requests
- `network:websocket` - WebSocket connections
- `process:execute` - Execute processes

## Performance Optimizations

### Command Alias Lookup

**Before**: O(N) linear search through all commands
**After**: O(1) Map-based lookup

```typescript
private aliasIndex: Map<string, string> = new Map(); // alias -> commandKey

// O(1) resolution
const command = this.aliasIndex.get(alias);
```

### Async Docker Operations

**Before**: Blocking `execSync()` calls (2-5 second UI freeze)
**After**: Non-blocking `exec()` with promises

Benefits:
- Event loop latency: 2-5s → 0ms
- Smooth UI spinner animations
- Concurrent operations support

### Service Metadata Caching

Service metadata is loaded once and cached:

```typescript
const metadataConfig = await loadServiceMetadata(); // Load once
// Pass to all extractServiceMetadata() calls
```

## Type System

### Type Architecture

```
┌─────────────────────────────────┐
│    @nexus-cli/types             │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────┐       │
│  │  Zod Schemas         │       │
│  │  (Runtime)           │       │
│  └──────┬───────────────┘       │
│         │ z.infer<>             │
│         ▼                       │
│  ┌──────────────────────┐       │
│  │  TypeScript Types    │       │
│  │  (Compile-time)      │       │
│  └──────────────────────┘       │
│                                 │
└─────────────────────────────────┘
```

**Key principle**: Single source of truth using `z.infer<typeof Schema>`

Benefits:
- No duplication between types and schemas
- Runtime validation matches compile-time types
- Changes propagate automatically
- Reduced maintenance burden

## Error Handling

### Error Classification

Docker operations use typed error classification:

```typescript
enum DockerErrorType {
  NOT_FOUND,
  NOT_RUNNING,
  PERMISSION_DENIED,
  TIMEOUT,
  NETWORK_ERROR,
  INVALID_COMMAND,
  UNKNOWN
}

class DockerExecutionError extends Error {
  constructor(
    public type: DockerErrorType,
    public command: string,
    message: string
  ) {
    super(message);
  }
}
```

### Error Recovery

- **Automatic retry**: For transient network errors
- **Graceful degradation**: Fallback to basic functionality if optional features fail
- **User-friendly messages**: Clear error descriptions with actionable suggestions

## Testing Strategy

### Unit Tests
- Core utilities (router, parser, transport)
- Zod schema validation
- Error handling

### Integration Tests
- Service discovery end-to-end
- Command execution flows
- Plugin loading and execution

### E2E Tests
- Complete CLI workflows
- Multi-service interactions
- Session persistence

## Future Enhancements

### Planned Features

1. **Performance Monitoring**
   - Prometheus metrics export
   - Grafana dashboards
   - Performance profiling tools

2. **Advanced Agent Features**
   - Multi-agent collaboration
   - Persistent memory across sessions
   - Learning from user feedback

3. **Enhanced Plugin System**
   - Plugin marketplace
   - Automatic updates
   - Dependency management

4. **Improved Discovery**
   - Kubernetes service discovery
   - Cloud provider integrations
   - Dynamic service registration

## Related Documentation

- [Main README](../../README.md)
- [Logging Migration Guide](../guides/LOGGING_MIGRATION.md)
- [Implementation Reports](../implementation/)
- [Contributing Guidelines](../../CONTRIBUTING.md)

---

**Last Updated**: 2025-11-19
