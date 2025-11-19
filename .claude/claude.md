# Claude Code Configuration for Nexus CLI

## Project Context

You are working on **Nexus CLI**, a world-class command-line interface for the Adverant-Nexus microservices platform. This is a production-ready TypeScript monorepo that provides:

- **Auto-discovery** of 32+ microservices
- **70+ MCP tools** exposed through Model Context Protocol
- **Interactive REPL** with tab completion and session management
- **Multi-agent orchestration** and autonomous task execution
- **Plugin system** with full SDK for extensibility

## Repository Structure

```
nexus-cli/
├── packages/
│   ├── types/           # @nexus-cli/types - Shared TypeScript types
│   ├── sdk/             # @nexus-cli/sdk - Plugin development SDK
│   └── cli/             # @nexus-cli/cli - Main CLI application
├── .github/workflows/   # CI/CD pipelines
├── docs/                # Documentation
└── examples/            # Usage examples
```

## Key Technologies

- **TypeScript 5.3+** with strict mode enabled
- **Node.js 20+** (ES Modules)
- **Commander.js** for CLI framework
- **Model Context Protocol (MCP)** for tool integration
- **Monorepo** with npm workspaces

## GitHub Repository

- **URL**: https://github.com/adverant/nexus-cli
- **Owner**: adverant
- **Default Branch**: main
- **License**: MIT

## Important Conventions

### TypeScript Standards
- All files use ES modules with `.js` extensions in imports
- Strict mode enabled: `exactOptionalPropertyTypes`, `noImplicitAny`, etc.
- All public APIs must have JSDoc comments
- No `any` types (use `unknown` and type guards)
- Use `@nexus-cli/types` for all shared types

### File Organization
- Commands in `packages/cli/src/commands/<group>/<command>.ts`
- Core infrastructure in `packages/cli/src/core/`
- Types in `packages/types/src/<domain>.ts`
- Each module exports a single default or named export

### Naming Conventions
- Files: kebab-case (e.g., `service-discovery.ts`)
- Classes: PascalCase (e.g., `ServiceDiscovery`)
- Functions: camelCase (e.g., `discoverServices`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- Interfaces: PascalCase with descriptive names (no `I` prefix)

### Code Style
- Use async/await (no callbacks)
- Prefer `const` over `let`
- Use template literals for string interpolation
- Add comprehensive error handling with try/catch
- Use Zod for runtime validation where needed

### Git Workflow
- Main branch: `main`
- Commit messages: Conventional Commits format
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for tests
  - `chore:` for maintenance

## Common Tasks

### Building
```bash
npm run build              # Build all packages
npm run build:watch        # Watch mode
npm run typecheck          # Type check without emitting
```

### Development
```bash
npm run dev:cli            # Run CLI in dev mode
npm run dev:sdk            # Run SDK in dev mode
```

### Testing
```bash
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Code Quality
```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix issues
npm run format             # Prettier format
```

## Architecture Notes

### Service Discovery
The CLI auto-discovers services from:
1. **docker-compose.yml** - Local development services
2. **OpenAPI/Swagger** - API endpoint schemas
3. **MCP Discovery** - Model Context Protocol tools
4. **Plugin Discovery** - User-installed plugins

### Command Router
Commands are registered through:
- **Static commands**: Defined in `packages/cli/src/commands/`
- **Dynamic commands**: Generated from discovered services
- **MCP tools**: Exposed as CLI commands
- **Plugin commands**: Loaded from `~/.nexus/plugins/`

### Transport Layer
Supports multiple transport protocols:
- **HTTP/REST** - For standard API calls
- **WebSocket** - For streaming and real-time updates
- **MCP stdio** - For Model Context Protocol tools

### Authentication
Three auth strategies:
1. **JWT tokens** - User login with token refresh
2. **API keys** - Programmatic access with permissions
3. **Attribution headers** - JIT user provisioning

## Critical Files

### Entry Points
- [packages/cli/src/index.ts](packages/cli/src/index.ts) - Main executable
- [packages/cli/src/cli.ts](packages/cli/src/cli.ts) - Commander setup

### Core Infrastructure
- [packages/cli/src/core/discovery/service-discovery.ts](packages/cli/src/core/discovery/service-discovery.ts)
- [packages/cli/src/core/router/command-router.ts](packages/cli/src/core/router/command-router.ts)
- [packages/cli/src/core/auth/auth-client.ts](packages/cli/src/core/auth/auth-client.ts)

### Type Definitions
- [packages/types/src/service.ts](packages/types/src/service.ts)
- [packages/types/src/command.ts](packages/types/src/command.ts)
- [packages/types/src/mcp.ts](packages/types/src/mcp.ts)

## Known Issues & Gotchas

### ES Module Imports
Always use `.js` extension in imports, even for `.ts` files:
```typescript
// ✅ Correct
import { foo } from './bar.js';

// ❌ Wrong
import { foo } from './bar';
import { foo } from './bar.ts';
```

### Type Safety
Use type guards for array/object access:
```typescript
// ✅ Correct
if (Array.isArray(value) && value.length > 0) {
  console.log(value[0]);
}

// ❌ Wrong
console.log(value[0]);  // Could be undefined
```

### Optional Properties
With `exactOptionalPropertyTypes`, distinguish between `undefined` and missing:
```typescript
// ✅ Correct
interface Config {
  optional?: string;  // Can be string or undefined, but not missing
}

// Use type guards
if (config.optional !== undefined) {
  // Safe to use
}
```

## Environment Setup

### Required Environment Variables
```bash
# Nexus API Configuration
NEXUS_API_URL=http://localhost:9092
NEXUS_WS_URL=ws://localhost:9093

# Authentication (one of these)
NEXUS_API_KEY=your-api-key
NEXUS_JWT_TOKEN=your-jwt-token

# Attribution (for JIT provisioning)
NEXUS_COMPANY=adverant
NEXUS_APP=nexus-cli
NEXUS_USER_ID=your-user-id
```

### Configuration Files
- **Global**: `~/.nexus/config.toml`
- **Workspace**: `./.nexus.toml` (project root)
- **Environment**: `./.env`

## Dependencies

### Production Dependencies (CLI)
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `axios` - HTTP client
- `ws` - WebSocket client
- `@modelcontextprotocol/sdk` - MCP integration
- Plus 42 more for rich terminal UX

### Development Dependencies
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `eslint` - Linting
- `prettier` - Code formatting
- `vitest` - Testing framework

## Testing Strategy

### Unit Tests
- Test individual functions and classes in isolation
- Mock external dependencies
- Use Vitest with TypeScript support

### Integration Tests
- Test command execution end-to-end
- Use real config files but mock network calls
- Verify output formatting

### E2E Tests
- Test full CLI workflows
- Use test fixtures and temporary directories
- Verify actual service integrations

## Documentation

### User Documentation
- [README.md](README.md) - Quick start and features
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security policy

### Technical Documentation
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Complete project overview
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference

### Code Documentation
All public APIs should have JSDoc comments with:
- Description of what the function/class does
- `@param` for each parameter
- `@returns` for return value
- `@throws` for potential errors
- `@example` for usage examples

## Release Process

### Version Bumping
```bash
npm version patch  # Bug fixes
npm version minor  # New features
npm version major  # Breaking changes
```

### Publishing to npm
```bash
npm run build
npm run test
npm publish --workspace=@nexus-cli/types
npm publish --workspace=@nexus-cli/sdk
npm publish --workspace=@nexus-cli/cli
```

### GitHub Releases
- Tag format: `v3.0.0`
- Include changelog with all changes
- Attach precompiled binaries for macOS, Linux, Windows

## Support & Resources

- **Issues**: https://github.com/adverant/nexus-cli/issues
- **Discussions**: https://github.com/adverant/nexus-cli/discussions
- **Security**: security@adverant.ai
- **Support**: support@adverant.ai

## Project Status

**Phase 2 Complete** ✅
- 109 TypeScript files
- 15,000+ lines of code
- 60+ commands implemented
- Zero TypeScript errors
- All packages building successfully
- CLI tested and functional

**Next Phase**: Integration with @adverant/brain-routing and comprehensive testing

---

## Quick Commands Reference

### Authentication
```bash
nexus auth login              # Interactive login
nexus auth register           # New user registration
nexus auth whoami             # Check auth status
nexus auth logout             # Logout and clear credentials
```

### Services
```bash
nexus services list           # List all discovered services
nexus services health --all   # Check health of all services
nexus services info graphrag  # Show service details
nexus services logs graphrag  # Stream service logs
```

### Organizations
```bash
nexus org list                # List organizations
nexus org create              # Create new org
nexus org switch my-org       # Switch default org
nexus org info                # Show org details
```

### API Keys
```bash
nexus api-key create          # Generate new API key
nexus api-key list            # List all keys
nexus api-key info key_id     # Show key details
nexus api-key delete key_id   # Revoke key
nexus api-key rotate key_id   # Rotate key
```

### Interactive Shell
```bash
nexus repl                    # Start interactive REPL
```

### Session Management
```bash
nexus session save name       # Save current session
nexus session list            # List all sessions
nexus session load name       # Load saved session
nexus session export > file   # Export session
```

---

**Last Updated**: 2025-11-19
**Version**: 3.0.0
**Status**: Production Ready
