# @adverant/nexus-cli

> Command-line interface for the Adverant-Nexus platform

[![Version](https://img.shields.io/npm/v/@adverant/nexus-cli.svg)](https://www.npmjs.com/package/@adverant/nexus-cli)
[![License](https://img.shields.io/npm/l/@adverant/nexus-cli.svg)](https://github.com/adverant/nexus-cli/blob/main/LICENSE)

## Installation

```bash
# Global installation
npm install -g @adverant/nexus-cli

# Or use npx
npx @adverant/nexus-cli --version
```

## Usage

```bash
# Check version
nexus --version

# List all services
nexus services list

# Start interactive REPL
nexus repl

# Get help
nexus --help
```

## Features

- 🚀 Auto-discovery of services from docker-compose and OpenAPI
- 🤖 Autonomous agent mode with ReAct framework
- 🔌 Extensible plugin system with SDK
- 📊 Multiple output formats (text, JSON, YAML, table)
- 🎨 Interactive REPL with command history
- 🔍 Real-time service monitoring and health checks
- 🔧 Workspace and session management

## Configuration

Global configuration: `~/.nexus/config.toml`
Workspace configuration: `.nexus.toml`

See the [main documentation](../../README.md) for complete configuration options.

## Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Documentation

- [Main README](../../README.md) - Complete documentation
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [API Documentation](../../docs/)

## License

MIT © Adverant AI
