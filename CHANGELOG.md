# Changelog

All notable changes to Nexus CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-12-28

### Added

- **60+ CLI Commands** organized across 12 command groups
- **Interactive REPL** with tab completion, syntax highlighting, and session management
- **Service Discovery** system for auto-detecting 32+ microservices
- **MCP Integration** exposing 70+ Model Context Protocol tools
- **Plugin System** with full SDK for extensibility
- **Multi-Agent Orchestration** supporting 10+ concurrent AI agents
- **ReAct Agent Mode** for autonomous task execution
- **Real-time Streaming** via WebSocket connections
- **Cost Tracking** and usage analytics
- **Organization Management** with team collaboration features

### Command Groups

- `auth` - Authentication and session management
- `services` - Service discovery and health monitoring
- `org` - Organization and team management
- `api-key` - API key CRUD operations
- `memory` - GraphRAG memory operations (store, recall, search)
- `agent` - MageAgent task orchestration
- `mcp` - Model Context Protocol tool management
- `infrastructure` - Infrastructure monitoring
- `devops` - DevOps automation commands
- `plugin` - Plugin management
- `config` - Configuration management
- `repl` - Interactive shell

### Technical Features

- Full TypeScript implementation with strict mode
- Monorepo architecture with npm workspaces
- Zero TypeScript errors across 109 source files
- ES Module support (Node.js 20+)
- Comprehensive error handling and validation

## [2.0.0] - 2025-11-15

### Changed

- Complete refactor from single-file CLI to modular monorepo
- Migrated to TypeScript 5.3+ with strict configuration
- Restructured into three packages: `@nexus-cli/cli`, `@nexus-cli/sdk`, `@nexus-cli/types`

### Fixed

- Resolved 100+ TypeScript strict mode errors
- Fixed authentication flow edge cases
- Improved WebSocket reconnection logic

## [1.0.0] - 2025-10-01

### Added

- Initial release of Nexus CLI
- Basic authentication commands
- Service discovery prototype
- GraphRAG memory commands
- MageAgent integration

---

## Package Versions

| Package | Version | Description |
|---------|---------|-------------|
| `@nexus-cli/cli` | 3.0.0 | Main CLI application |
| `@nexus-cli/sdk` | 3.0.0 | Plugin development SDK |
| `@nexus-cli/types` | 3.0.0 | Shared TypeScript types |

## Migration Guide

### From 2.x to 3.0

No breaking changes for end users. Plugin developers should update to the new SDK:

```bash
npm install @nexus-cli/sdk@3.0.0
```

### From 1.x to 2.0

The CLI executable name changed:

```bash
# Old (1.x)
nexus-cli services list

# New (2.x+)
nexus services list
```

## Links

- [Documentation](https://github.com/adverant/Adverant-Nexus-CLI#readme)
- [Issue Tracker](https://github.com/adverant/Adverant-Nexus-CLI/issues)
- [Releases](https://github.com/adverant/Adverant-Nexus-CLI/releases)
