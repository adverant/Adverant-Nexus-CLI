# Nexus CLI

> World-class command-line interface for the Adverant-Nexus platform - Surpassing Claude Code CLI and Gemini CLI

[![Version](https://img.shields.io/npm/v/@nexus-cli/cli.svg)](https://www.npmjs.com/package/@nexus-cli/cli)
[![License](https://img.shields.io/npm/l/@nexus-cli/cli.svg)](https://github.com/adverant/nexus-cli/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

## Overview

The **Nexus CLI** is a production-grade, auto-discovering command-line interface that provides unified access to the entire Adverant-Nexus microservices ecosystem. Built with intelligent automation, extensibility, and developer experience at its core.

## Why Nexus CLI?

| Feature | Nexus CLI | Claude Code | Gemini CLI |
|---------|-----------|-------------|------------|
| **Auto-Discovery** | ✅ All services & plugins | ❌ Manual | ❌ Manual |
| **Service Commands** | ✅ 32+ services | ❌ Single agent | ❌ Single agent |
| **MCP Tools** | ✅ 70+ tools exposed | ❌ N/A | ❌ N/A |
| **Plugin System** | ✅ Full SDK | ✅ Skills | ✅ Extensions |
| **Interactive REPL** | ✅ Full-featured | ❌ Chat only | ✅ Yes |
| **Streaming** | ✅ WebSocket + SSE | ✅ Yes | ✅ Yes |
| **ReAct Agent** | ✅ 20 iterations | ✅ Task agent | ❌ No |
| **Multi-Agent** | ✅ 10+ agents | ❌ Single | ❌ Single |
| **Workflow Automation** | ✅ YAML + Visual | ❌ None | ⚠️ Limited |
| **AI-Powered Suggestions** | ✅ ML-based | ⚠️ Basic | ⚠️ Basic |
| **Real-time Monitoring** | ✅ Dashboard | ❌ None | ❌ None |
| **Cost Tracking** | ✅ Built-in | ❌ None | ❌ None |
| **Collaboration** | ✅ Multi-user sessions | ❌ None | ❌ None |

## Features

### 🚀 Auto-Discovery & Integration
- **Automatic service detection** from docker-compose.yml and Kubernetes
- **OpenAPI schema parsing** for automatic command generation
- **MCP tool discovery** for Adverant-Nexus system integration
- **Plugin auto-loading** from ~/.nexus/plugins/
- **32+ microservices** accessible via single CLI
- **500+ API endpoints** exposed as commands

### 🤖 Intelligent Automation
- **AI-powered command suggestions** based on usage patterns
- **Natural language commands**: `nexus ask "How do I deploy GraphRAG?"`
- **Context-aware execution** with smart parameter binding
- **ReAct agent mode** for autonomous task execution
- **Multi-agent orchestration** (up to 10 agents)
- **Workflow templates** with YAML definitions
- **Interactive workflow builder** (TUI)

### 🔌 Extensible Architecture
- **Plugin SDK** for third-party extensions
- **MCP protocol** support for tool integration
- **Custom commands** via workspace configuration
- **Hot-reloadable** plugin system
- **Permission-based** plugin sandbox

### 📊 Multiple Output Formats
- **Text** (human-readable with colors)
- **JSON** (machine-parseable)
- **YAML** (configuration files)
- **Table** (structured data)
- **Stream-JSON** (real-time events)

### 🎨 Rich Developer Experience
- **Interactive REPL** mode with history
- **Tab completion** for all commands
- **Session checkpointing** (save/resume work)
- **Streaming progress** for long operations
- **Git integration** (status, diff, commit)
- **Performance profiling** and optimization suggestions

### 🔍 Real-time Monitoring
- **Service health dashboard** with live updates
- **Custom alert conditions** and notifications
- **Performance metrics** tracking
- **Cost tracking** for API operations
- **Time-series analytics** and reporting

### 🤝 Collaboration Features
- **Real-time session sharing** with team members
- **Session export/import** for reproducibility
- **Command history** sync across team
- **Conflict resolution** for concurrent commands

## Installation

### From NPM (Recommended)

```bash
npm install -g @nexus-cli/cli
```

### From Source

```bash
# Clone repository
git clone https://github.com/adverant/nexus-cli.git
cd nexus-cli

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link

# Verify installation
nexus --version
```

## Quick Start

```bash
# Check CLI version
nexus --version

# Connect to Adverant-Nexus instance
nexus config set api-url http://localhost:9092

# Show all discovered services
nexus services list

# Check service health
nexus services health --all

# Store a document in GraphRAG
nexus graphrag store-document --file report.pdf --title "Q4 Report"

# Query GraphRAG
nexus graphrag query --text "user authentication patterns"

# Run multi-agent orchestration
nexus mageagent orchestrate --task "Analyze codebase for security issues"

# Execute code in sandbox
nexus sandbox execute --code "print('Hello, Nexus!')" --language python

# Start interactive REPL
nexus repl

# Run autonomous agent
nexus agent run --task "Fix all TypeScript errors"
```

## Core Commands

### Service Management

```bash
# List all services
nexus services list

# Check service status
nexus services status

# Get service info
nexus services info graphrag

# View logs
nexus services logs graphrag --follow

# Check health
nexus services health --all
```

### GraphRAG (Document & Memory Intelligence)

```bash
# Store document
nexus graphrag store-document --file report.pdf

# Query documents
nexus graphrag query --text "search query"

# Store entity
nexus graphrag store-entity --domain code --type class --content "User"

# Create relationship
nexus graphrag create-relationship --source id1 --target id2 --type CALLS
```

### MageAgent (Multi-Agent Orchestration)

```bash
# Orchestrate task
nexus mageagent orchestrate --task "Complex task" --max-agents 5

# Analyze input
nexus mageagent analyze --input code.ts --focus security

# Collaborate mode
nexus mageagent collaborate --agents 3 --task "Build API"
```

### Autonomous Agent Mode

```bash
# Run autonomous task
nexus agent run --task "Implement user authentication"

# With constraints
nexus agent run \
  --task "Security audit" \
  --max-iterations 20 \
  --budget 50 \
  --stream
```

### Workflow Automation

```bash
# Run workflow template
nexus workflow run deploy-graphrag --version=2.1.0

# Record workflow
nexus workflow record my-workflow

# Replay workflow
nexus workflow replay my-workflow

# List templates
nexus workflow list
```

### AI-Powered Features

```bash
# Natural language commands
nexus ask "How do I check if all services are healthy?"

# Generate command from description
nexus generate-command "store a PDF and query it"

# Get intelligent suggestions
nexus suggest  # Based on current context
```

### Session Management

```bash
# Save session
nexus session save my-work

# List sessions
nexus session list

# Resume session
nexus session load my-work

# Export/import
nexus session export my-work > session.nsx
nexus session import < session.nsx
```

### Monitoring & Analytics

```bash
# Start monitoring dashboard
nexus monitor dashboard --interval=5s

# Watch specific services
nexus monitor watch graphrag mageagent

# Set alerts
nexus monitor alert --service=graphrag --metric=latency --threshold=500ms

# View analytics
nexus analytics dashboard

# Generate report
nexus analytics report --period=week --format=html
```

## Configuration

### Global Configuration

Located at: `~/.nexus/config.toml`

```toml
[services]
api_url = "http://localhost:9092"
ws_url = "ws://localhost:9093"
timeout = 30000

[auth]
api_key = "${NEXUS_API_KEY}"
strategy = "api-key"

[defaults]
output_format = "json"
streaming = true
verbose = false

[plugins]
enabled = ["my-plugin"]
disabled = []
```

### Workspace Configuration

Located at: `.nexus.toml` (project root)

```toml
[workspace]
name = "my-project"
type = "typescript"

[agent]
max_iterations = 20
auto_approve_safe = true

[adverant]
auto_store = true
memory_tags = ["project:my-project"]

[[shortcuts]]
name = "test"
command = "sandbox execute --file tests/run.py"
```

## Plugin Development

### Create a Plugin

```bash
# Initialize plugin
nexus plugin init my-plugin --template typescript

# Plugin structure:
my-plugin/
├── plugin.json          # Plugin manifest
├── src/
│   ├── index.ts        # Main entry point
│   └── commands/       # Command implementations
├── package.json
└── README.md
```

### Plugin Example

```typescript
import { PluginBuilder } from '@nexus-cli/sdk';

export default PluginBuilder
  .create('my-plugin')
  .version('1.0.0')
  .description('My custom plugin')

  .command('analyze', {
    description: 'Analyze data',
    args: [{ name: 'input', type: 'string', required: true }],
    handler: async (args, context) => {
      // Access Nexus services
      const result = await context.services.graphrag.query({
        text: `Analyze file: ${args.input}`
      });

      return { success: true, data: result };
    }
  })

  .build();
```

### Install Plugin

```bash
# Install locally
nexus plugin install ./my-plugin

# Install from registry
nexus plugin install my-plugin
```

## Architecture

The CLI is built with a modular, auto-discovering architecture:

```
┌─────────────────────────────────────────────────────┐
│              Nexus CLI                              │
├─────────────────────────────────────────────────────┤
│  Interactive REPL │ Scripting │ Autonomous Agent    │
│         ↓              ↓              ↓              │
│            Command Router (Auto-Discovery)          │
│         ↓              ↓              ↓              │
│  Service Commands │ MCP Tools │ Plugin Commands     │
│         ↓              ↓              ↓              │
│         Transport Layer (HTTP | WS | MCP)           │
│                      ↓                               │
│           Adverant-Nexus Microservices              │
└─────────────────────────────────────────────────────┘
```

**Key Components:**
- **Service Discovery**: Auto-discovers services from docker-compose and OpenAPI
- **Command Router**: Dynamically routes commands to appropriate handlers
- **Transport Layer**: HTTP, WebSocket, and MCP protocol support
- **Plugin System**: Third-party extensions with full SDK
- **Output Formatters**: Multiple output formats for different use cases

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for complete details.

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev:cli
```

### Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

## Security

For security vulnerabilities, please email security@adverant.ai. See [SECURITY.md](SECURITY.md) for details.

## License

MIT © Adverant AI

See [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [Full Documentation](https://github.com/adverant/nexus-cli/tree/main/docs)
- **Issues**: [GitHub Issues](https://github.com/adverant/nexus-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/adverant/nexus-cli/discussions)
- **Email**: support@adverant.ai

## Related Projects

- [Adverant-Nexus Platform](https://github.com/adverant/adverant-nexus) - Main platform
- [@nexus-cli/sdk](./packages/sdk) - SDK for building plugins

---

**Made with ❤️ by Adverant AI**
