# Nexus CLI ASCII Art Banner Designs

Research-driven designs inspired by modern CLIs (Docker, Kubernetes, GitHub CLI, Vercel) with emphasis on network topology, AI intelligence, and microservices architecture.

---

## Design Variant 1: COMPACT (2-3 lines)
### For quick commands, help text, short outputs

```
╔═══╗ ╔═╗  ╔═══╗ ╔╗  ╔╗ ╔╗  ╔╗ ╔═══╗
║ ╔═╝ ║ ║  ║ ╔═╝ ║╚╗╔╝║ ║║  ║║ ║ ╔═╝
║ ╚═╗ ║ ╚══╝ ╚═╗ ╚═╝ ╔╝ ║╚══╝║ ║ ╚═╗  AI-Powered Microservices CLI
╚═══╝ ╚════╝ ╚═══╝   ╚══╝ ╚════╝ ╚═══╝  v{{ version }}
```

**Alternative Compact (Ultra-minimal)**:
```
⬡ NEXUS CLI  ⬡  AI-Powered Microservices  ⬡  v{{ version }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**TypeScript Implementation (Compact)**:
```typescript
import chalk from 'chalk';

export function compactBanner(version: string): string {
  return `
${chalk.cyan('╔═══╗')} ${chalk.cyan('╔═╗')}  ${chalk.cyan('╔═══╗')} ${chalk.cyan('╔╗')}  ${chalk.cyan('╔╗')} ${chalk.cyan('╔╗')}  ${chalk.cyan('╔╗')} ${chalk.cyan('╔═══╗')}
${chalk.cyan('║ ╔═╝')} ${chalk.cyan('║ ║')}  ${chalk.cyan('║ ╔═╝')} ${chalk.cyan('║╚╗╔╝║')} ${chalk.cyan('║║')}  ${chalk.cyan('║║')} ${chalk.cyan('║ ╔═╝')}
${chalk.cyan('║ ╚═╗')} ${chalk.cyan('║ ╚══╝')} ${chalk.cyan('╚═╗')} ${chalk.cyan('╚═╝')} ${chalk.cyan('╔╝')} ${chalk.cyan('║╚══╝║')} ${chalk.cyan('║ ╚═╗')}  ${chalk.gray('AI-Powered Microservices CLI')}
${chalk.cyan('╚═══╝')} ${chalk.cyan('╚════╝')} ${chalk.cyan('╚═══╝')}   ${chalk.cyan('╚══╝')} ${chalk.cyan('╚════╝')} ${chalk.cyan('╚═══╝')}  ${chalk.gray(`v${version}`)}
`.trim();
}

// Ultra-minimal variant
export function minimalBanner(version: string): string {
  return `
${chalk.cyan('⬡')} ${chalk.bold.white('NEXUS CLI')}  ${chalk.cyan('⬡')}  ${chalk.gray('AI-Powered Microservices')}  ${chalk.cyan('⬡')}  ${chalk.gray(`v${version}`)}
${chalk.cyan('━'.repeat(70))}
`.trim();
}
```

**Chalk Color Suggestions**:
- Primary text: `chalk.cyan` (network/tech feel)
- Tagline: `chalk.gray` (subtle)
- Version: `chalk.gray` or `chalk.dim.white`

---

## Design Variant 2: STANDARD (5-7 lines)
### For main CLI banner, command outputs, normal usage

### Option A: Network Topology Theme
```
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     ╔╗  ╔╗ ╔═══╗ ╔╗  ╔╗ ╔╗  ╔╗ ╔═══╗     ╔═══╗ ╔╗   ╔══╗ ║
    ║     ║║  ║║ ║╔══╝ ║╚╗╔╝║ ║║  ║║ ║╔══╝     ║╔═╗║ ║║   ╚╗╔╝ ║
    ║     ║╚══╝║ ║╚══╗ ╚╗╚╝╔╝ ║║  ║║ ║╚══╗     ║║ ║║ ║║    ║║  ║
    ║     ╚════╝ ╚═══╝  ╚══╝  ╚╝  ╚╝ ╚═══╝     ╚╝ ╚╝ ╚╝    ╚╝  ║
    ║                                                           ║
    ║        ⬡━━━⬡━━━⬡  AI-Powered Microservices Orchestration  ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
                              v{{ version }}
```

### Option B: Neural Network Theme (Recommended)
```
    ┌─────────────────────────────────────────────────────────────┐
    │  ╔╗╔  ╔═╗ ╦  ╦ ╦ ╦ ╔═╗    ┌──○──○──┐                       │
    │  ║║║  ║╣  ╚╗╔╝ ║ ║ ╚═╗    │  ╲ │ ╱  │   AI-Powered         │
    │  ╝╚╝  ╚═╝  ╚╝  ╚═╝ ╚═╝    └──○──○──┘   Microservices CLI   │
    │                             ╱ │ ╲                           │
    │                           ○───○───○                         │
    └─────────────────────────────────────────────────────────────┘
                                v{{ version }}
```

### Option C: Microservices Mesh
```
    ╭──────────────────────────────────────────────────────────────╮
    │                                                              │
    │   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               │
    │   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               │
    │   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               │
    │   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               │
    │   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               │
    │   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               │
    │                                                              │
    │        ◉─────◉─────◉   Intelligent Service Orchestration    │
    │         ╲   ╱ ╲   ╱                                          │
    │          ◉───◉───◉                                           │
    │                                                              │
    ╰──────────────────────────────────────────────────────────────╯
                              v{{ version }}
```

**TypeScript Implementation (Standard - Neural Network)**:
```typescript
import chalk from 'chalk';

export function standardBanner(version: string): string {
  const border = chalk.cyan('─'.repeat(61));
  return `
${chalk.cyan('┌─' + border + '─┐')}
${chalk.cyan('│')}  ${chalk.bold.white('╔╗╔  ╔═╗ ╦  ╦ ╦ ╦ ╔═╗')}    ${chalk.magenta('┌──○──○──┐')}                       ${chalk.cyan('│')}
${chalk.cyan('│')}  ${chalk.bold.white('║║║  ║╣  ╚╗╔╝ ║ ║ ╚═╗')}    ${chalk.magenta('│  ╲ │ ╱  │')}   ${chalk.gray('AI-Powered')}         ${chalk.cyan('│')}
${chalk.cyan('│')}  ${chalk.bold.white('╝╚╝  ╚═╝  ╚╝  ╚═╝ ╚═╝')}    ${chalk.magenta('└──○──○──┘')}   ${chalk.gray('Microservices CLI')}   ${chalk.cyan('│')}
${chalk.cyan('│')}                             ${chalk.magenta('╱ │ ╲')}                           ${chalk.cyan('│')}
${chalk.cyan('│')}                           ${chalk.magenta('○───○───○')}                         ${chalk.cyan('│')}
${chalk.cyan('└─' + border + '─┘')}
                                ${chalk.dim(`v${version}`)}
`.trim();
}

// Microservices Mesh variant
export function meshBanner(version: string): string {
  return `
${chalk.cyan('╭──────────────────────────────────────────────────────────────╮')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}               ${chalk.cyan('│')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('│')}        ${chalk.magenta('◉─────◉─────◉')}   ${chalk.gray('Intelligent Service Orchestration')}    ${chalk.cyan('│')}
${chalk.cyan('│')}         ${chalk.magenta('╲   ╱ ╲   ╱')}                                          ${chalk.cyan('│')}
${chalk.cyan('│')}          ${chalk.magenta('◉───◉───◉')}                                           ${chalk.cyan('│')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('╰──────────────────────────────────────────────────────────────╯')}
                              ${chalk.dim(`v${version}`)}
`.trim();
}
```

**Chalk Color Suggestions**:
- Border/frame: `chalk.cyan`
- Main text: `chalk.bold.white` or `chalk.bold.cyan`
- Neural nodes: `chalk.magenta` (AI/intelligence)
- Tagline: `chalk.gray`
- Service mesh: `chalk.magenta` nodes, `chalk.cyan` connections

---

## Design Variant 3: FULL BANNER (8-12 lines)
### For README, documentation, splash screen, version info

### Option A: Complete Network Architecture
```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ███╗   ██╗ ███████╗ ██╗  ██╗ ██╗   ██╗ ███████╗                         ║
║   ████╗  ██║ ██╔════╝ ╚██╗██╔╝ ██║   ██║ ██╔════╝                         ║
║   ██╔██╗ ██║ █████╗    ╚███╔╝  ██║   ██║ ███████╗                         ║
║   ██║╚██╗██║ ██╔══╝    ██╔██╗  ██║   ██║ ╚════██║                         ║
║   ██║ ╚████║ ███████╗ ██╔╝ ██╗ ╚██████╔╝ ███████║    ╔═══════════╗        ║
║   ╚═╝  ╚═══╝ ╚══════╝ ╚═╝  ╚═╝  ╚═════╝  ╚══════╝    ║  CLI v{{ version }}     ║
║                                                       ╚═══════════╝        ║
║   ┌─────────────────────────────────────────────────────────────────┐     ║
║   │                 🧠 AI-Powered Microservices Orchestration        │     ║
║   │                                                                  │     ║
║   │     ╭─────╮      ╭─────╮      ╭─────╮      ╭─────╮              │     ║
║   │     │ API ○──────○ Auth○──────○Graph○──────○ Mage│              │     ║
║   │     ╰─────╯      ╰─────╯      ╰─────╯      ╰─────╯              │     ║
║   │        ║            ║            ║            ║                  │     ║
║   │        ╚════════════╩════════════╩════════════╝                  │     ║
║   │                    Unified Nexus Network                         │     ║
║   └─────────────────────────────────────────────────────────────────┘     ║
║                                                                            ║
║   GraphRAG • MageAgent • Authentication • API Gateway • PostgreSQL         ║
║   Redis • Neo4j • Qdrant • Docker Compose • TypeScript • Node.js          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

          Intelligent Service Management for Modern Applications
                    https://github.com/adverant/nexus-cli
```

### Option B: Neural Network Intelligence
```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║       ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                        ║
║       ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                        ║
║       ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                        ║
║       ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                        ║
║       ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                        ║
║       ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    CLI v{{ version }}          ║
║                                                                           ║
║   ┌────────────────────────────────────────────────────────────────┐     ║
║   │        🧠 Intelligent Microservices Orchestration              │     ║
║   │                                                                 │     ║
║   │                      Input Layer                               │     ║
║   │                    ○────○────○────○                            │     ║
║   │                   ╱│╲  ╱│╲  ╱│╲  ╱│╲                           │     ║
║   │                  ╱ │ ╲╱ │ ╲╱ │ ╲╱ │ ╲                          │     ║
║   │                 ○──○──○──○──○──○──○──○   Hidden Layer (AI)     │     ║
║   │                  ╲ │ ╱╲ │ ╱╲ │ ╱╲ │ ╱                          │     ║
║   │                   ╲│╱  ╲│╱  ╲│╱  ╲│╱                           │     ║
║   │                    ○────○────○────○                            │     ║
║   │                                                                 │     ║
║   │           GraphRAG  MageAgent  Auth  API-Gateway               │     ║
║   └────────────────────────────────────────────────────────────────┘     ║
║                                                                           ║
║   Stack: TypeScript • Node.js • Docker • PostgreSQL • Redis • Neo4j       ║
║   Features: Service Discovery • Health Monitoring • Log Aggregation       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

              🚀 Build, Deploy, and Manage AI Microservices
                   https://github.com/adverant/nexus-cli
```

### Option C: Hexagonal Architecture (Most Unique)
```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║             ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                  ║
║             ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                  ║
║             ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                  ║
║             ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                  ║
║             ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                  ║
║             ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝  CLI v{{ version }}      ║
║                                                                           ║
║        ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓          ║
║        ┃          ⬡ AI-Powered Microservices Hub ⬡          ┃          ║
║        ┃                                                     ┃          ║
║        ┃                    ╱──────╲                         ┃          ║
║        ┃                   ╱  Nexus ╲                        ┃          ║
║        ┃          Auth ───⬡   Core   ⬡─── GraphRAG          ┃          ║
║        ┃                   ╲   Hub   ╱                       ┃          ║
║        ┃                    ╲──────╱                         ┃          ║
║        ┃          Gateway ───⬡       ⬡─── MageAgent         ┃          ║
║        ┃                                                     ┃          ║
║        ┃              PostgreSQL • Redis • Neo4j            ┃          ║
║        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛          ║
║                                                                           ║
║   Commands: nexus start • nexus deploy • nexus logs • nexus health        ║
║   Intelligent orchestration for modern cloud-native applications          ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

**TypeScript Implementation (Full Banner - Hexagonal)**:
```typescript
import chalk from 'chalk';

export function fullBanner(version: string): string {
  return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}  ${chalk.gray(`CLI v${version}`)}      ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.yellow('⬡')} ${chalk.bold.white('AI-Powered Microservices Hub')} ${chalk.yellow('⬡')}          ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                                                     ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                    ${chalk.white('╱──────╲')}                         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                   ${chalk.white('╱')}  ${chalk.bold.cyan('Nexus')} ${chalk.white('╲')}                        ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.green('Auth')} ${chalk.white('───')}${chalk.yellow('⬡')}   ${chalk.bold.white('Core')}   ${chalk.yellow('⬡')}${chalk.white('─── ')}${chalk.blue('GraphRAG')}          ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                   ${chalk.white('╲')}   ${chalk.bold.cyan('Hub')}   ${chalk.white('╱')}                       ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                    ${chalk.white('╲──────╱')}                         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.green('Gateway')} ${chalk.white('───')}${chalk.yellow('⬡')}       ${chalk.yellow('⬡')}${chalk.white('─── ')}${chalk.blue('MageAgent')}         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                                                     ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}              ${chalk.gray('PostgreSQL • Redis • Neo4j')}            ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.white('Commands:')} ${chalk.green('nexus start')} ${chalk.gray('•')} ${chalk.green('nexus deploy')} ${chalk.gray('•')} ${chalk.green('nexus logs')} ${chalk.gray('•')} ${chalk.green('nexus health')}        ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Intelligent orchestration for modern cloud-native applications')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════╝')}
`.trim();
}

// Neural Network variant
export function neuralBanner(version: string): string {
  return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}    ${chalk.gray(`CLI v${version}`)}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('┌────────────────────────────────────────────────────────────────┐')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}        ${chalk.yellow('🧠')} ${chalk.bold.white('Intelligent Microservices Orchestration')}              ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                                                                 ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                      ${chalk.gray('Input Layer')}                               ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                    ${chalk.yellow('○────○────○────○')}                            ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                   ${chalk.white('╱│╲  ╱│╲  ╱│╲  ╱│╲')}                           ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                  ${chalk.white('╱ │ ╲╱ │ ╲╱ │ ╲╱ │ ╲')}                          ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                 ${chalk.magenta('○──○──○──○──○──○──○──○')}   ${chalk.gray('Hidden Layer (AI)')}     ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                  ${chalk.white('╲ │ ╱╲ │ ╱╲ │ ╱╲ │ ╱')}                          ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                   ${chalk.white('╲│╱  ╲│╱  ╲│╱  ╲│╱')}                           ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                    ${chalk.green('○────○────○────○')}                            ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                                                                 ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}           ${chalk.blue('GraphRAG')}  ${chalk.green('MageAgent')}  ${chalk.yellow('Auth')}  ${chalk.cyan('API-Gateway')}               ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('└────────────────────────────────────────────────────────────────┘')}     ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Stack:')} ${chalk.white('TypeScript • Node.js • Docker • PostgreSQL • Redis • Neo4j')}       ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Features:')} ${chalk.white('Service Discovery • Health Monitoring • Log Aggregation')}       ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════╝')}

              ${chalk.yellow('🚀')} ${chalk.bold.white('Build, Deploy, and Manage AI Microservices')}
                   ${chalk.dim.cyan('https://github.com/adverant/nexus-cli')}
`.trim();
}
```

**Chalk Color Scheme (Full Banner)**:
- Border: `chalk.cyan`
- Main logo: `chalk.bold.white` → `chalk.bold.cyan` (gradient effect)
- Inner frame: `chalk.magenta`
- Hexagon nodes: `chalk.yellow` (⬡)
- Service names: `chalk.green`, `chalk.blue`, `chalk.yellow` (differentiation)
- Neural nodes: `chalk.yellow` (input), `chalk.magenta` (hidden), `chalk.green` (output)
- Descriptions: `chalk.gray`
- Commands: `chalk.green`
- Links: `chalk.dim.cyan`

---

## Complete CLI Integration Example

```typescript
// src/utils/banner.ts
import chalk from 'chalk';

export interface BannerOptions {
  variant?: 'compact' | 'standard' | 'full' | 'minimal';
  theme?: 'neural' | 'mesh' | 'hexagon';
  showVersion?: boolean;
  showTagline?: boolean;
}

export class NexusBanner {
  constructor(private version: string) {}

  display(options: BannerOptions = {}): void {
    const {
      variant = 'standard',
      theme = 'hexagon',
      showVersion = true,
      showTagline = true,
    } = options;

    let banner: string;

    switch (variant) {
      case 'minimal':
        banner = this.minimal();
        break;
      case 'compact':
        banner = this.compact();
        break;
      case 'standard':
        banner = theme === 'neural' ? this.neuralStandard() : this.meshStandard();
        break;
      case 'full':
        banner = theme === 'neural' ? this.neuralFull() : this.hexagonFull();
        break;
      default:
        banner = this.hexagonFull();
    }

    console.log(banner);

    if (showTagline && variant !== 'full') {
      console.log(chalk.gray('Intelligent Service Management for Modern Applications'));
      console.log();
    }
  }

  private minimal(): string {
    return `
${chalk.cyan('⬡')} ${chalk.bold.white('NEXUS CLI')}  ${chalk.cyan('⬡')}  ${chalk.gray('AI-Powered Microservices')}  ${chalk.cyan('⬡')}  ${chalk.gray(`v${this.version}`)}
${chalk.cyan('━'.repeat(70))}
    `.trim();
  }

  private compact(): string {
    return `
${chalk.cyan('╔═══╗')} ${chalk.cyan('╔═╗')}  ${chalk.cyan('╔═══╗')} ${chalk.cyan('╔╗')}  ${chalk.cyan('╔╗')} ${chalk.cyan('╔╗')}  ${chalk.cyan('╔╗')} ${chalk.cyan('╔═══╗')}
${chalk.cyan('║ ╔═╝')} ${chalk.cyan('║ ║')}  ${chalk.cyan('║ ╔═╝')} ${chalk.cyan('║╚╗╔╝║')} ${chalk.cyan('║║')}  ${chalk.cyan('║║')} ${chalk.cyan('║ ╔═╝')}
${chalk.cyan('║ ╚═╗')} ${chalk.cyan('║ ╚══╝')} ${chalk.cyan('╚═╗')} ${chalk.cyan('╚═╝')} ${chalk.cyan('╔╝')} ${chalk.cyan('║╚══╝║')} ${chalk.cyan('║ ╚═╗')}  ${chalk.gray('AI-Powered Microservices CLI')}
${chalk.cyan('╚═══╝')} ${chalk.cyan('╚════╝')} ${chalk.cyan('╚═══╝')}   ${chalk.cyan('╚══╝')} ${chalk.cyan('╚════╝')} ${chalk.cyan('╚═══╝')}  ${chalk.gray(`v${this.version}`)}
    `.trim();
  }

  private neuralStandard(): string {
    const border = '─'.repeat(61);
    return `
${chalk.cyan('┌─' + border + '─┐')}
${chalk.cyan('│')}  ${chalk.bold.white('╔╗╔  ╔═╗ ╦  ╦ ╦ ╦ ╔═╗')}    ${chalk.magenta('┌──○──○──┐')}                       ${chalk.cyan('│')}
${chalk.cyan('│')}  ${chalk.bold.white('║║║  ║╣  ╚╗╔╝ ║ ║ ╚═╗')}    ${chalk.magenta('│  ╲ │ ╱  │')}   ${chalk.gray('AI-Powered')}         ${chalk.cyan('│')}
${chalk.cyan('│')}  ${chalk.bold.white('╝╚╝  ╚═╝  ╚╝  ╚═╝ ╚═╝')}    ${chalk.magenta('└──○──○──┘')}   ${chalk.gray('Microservices CLI')}   ${chalk.cyan('│')}
${chalk.cyan('│')}                             ${chalk.magenta('╱ │ ╲')}                           ${chalk.cyan('│')}
${chalk.cyan('│')}                           ${chalk.magenta('○───○───○')}                         ${chalk.cyan('│')}
${chalk.cyan('└─' + border + '─┘')}
                                ${chalk.dim(`v${this.version}`)}
    `.trim();
  }

  private meshStandard(): string {
    return `
${chalk.cyan('╭──────────────────────────────────────────────────────────────╮')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.white('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}               ${chalk.cyan('│')}
${chalk.cyan('│')}   ${chalk.bold.cyan('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}               ${chalk.cyan('│')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('│')}        ${chalk.magenta('◉─────◉─────◉')}   ${chalk.gray('Intelligent Service Orchestration')}    ${chalk.cyan('│')}
${chalk.cyan('│')}         ${chalk.magenta('╲   ╱ ╲   ╱')}                                          ${chalk.cyan('│')}
${chalk.cyan('│')}          ${chalk.magenta('◉───◉───◉')}                                           ${chalk.cyan('│')}
${chalk.cyan('│')}                                                              ${chalk.cyan('│')}
${chalk.cyan('╰──────────────────────────────────────────────────────────────╯')}
                              ${chalk.dim(`v${this.version}`)}
    `.trim();
  }

  private hexagonFull(): string {
    return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.cyan('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}             ${chalk.bold.white('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}  ${chalk.gray(`CLI v${this.version}`)}      ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.yellow('⬡')} ${chalk.bold.white('AI-Powered Microservices Hub')} ${chalk.yellow('⬡')}          ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                                                     ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                    ${chalk.white('╱──────╲')}                         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                   ${chalk.white('╱')}  ${chalk.bold.cyan('Nexus')} ${chalk.white('╲')}                        ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.green('Auth')} ${chalk.white('───')}${chalk.yellow('⬡')}   ${chalk.bold.white('Core')}   ${chalk.yellow('⬡')}${chalk.white('─── ')}${chalk.blue('GraphRAG')}          ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                   ${chalk.white('╲')}   ${chalk.bold.cyan('Hub')}   ${chalk.white('╱')}                       ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                    ${chalk.white('╲──────╱')}                         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}          ${chalk.green('Gateway')} ${chalk.white('───')}${chalk.yellow('⬡')}       ${chalk.yellow('⬡')}${chalk.white('─── ')}${chalk.blue('MageAgent')}         ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}                                                     ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┃')}              ${chalk.gray('PostgreSQL • Redis • Neo4j')}            ${chalk.magenta('┃')}          ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.white('Commands:')} ${chalk.green('nexus start')} ${chalk.gray('•')} ${chalk.green('nexus deploy')} ${chalk.gray('•')} ${chalk.green('nexus logs')} ${chalk.gray('•')} ${chalk.green('nexus health')}        ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Intelligent orchestration for modern cloud-native applications')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════╝')}
    `.trim();
  }

  private neuralFull(): string {
    return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.cyan('██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║')}                        ${chalk.cyan('║')}
${chalk.cyan('║')}       ${chalk.bold.white('╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}    ${chalk.gray(`CLI v${this.version}`)}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('┌────────────────────────────────────────────────────────────────┐')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}        ${chalk.yellow('🧠')} ${chalk.bold.white('Intelligent Microservices Orchestration')}              ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                                                                 ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                      ${chalk.gray('Input Layer')}                               ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                    ${chalk.yellow('○────○────○────○')}                            ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                   ${chalk.white('╱│╲  ╱│╲  ╱│╲  ╱│╲')}                           ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                  ${chalk.white('╱ │ ╲╱ │ ╲╱ │ ╲╱ │ ╲')}                          ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                 ${chalk.magenta('○──○──○──○──○──○──○──○')}   ${chalk.gray('Hidden Layer (AI)')}     ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                  ${chalk.white('╲ │ ╱╲ │ ╱╲ │ ╱╲ │ ╱')}                          ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                   ${chalk.white('╲│╱  ╲│╱  ╲│╱  ╲│╱')}                           ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                    ${chalk.green('○────○────○────○')}                            ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                                                                 ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}           ${chalk.blue('GraphRAG')}  ${chalk.green('MageAgent')}  ${chalk.yellow('Auth')}  ${chalk.cyan('API-Gateway')}               ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('└────────────────────────────────────────────────────────────────┘')}     ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Stack:')} ${chalk.white('TypeScript • Node.js • Docker • PostgreSQL • Redis • Neo4j')}       ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Features:')} ${chalk.white('Service Discovery • Health Monitoring • Log Aggregation')}       ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════╝')}

              ${chalk.yellow('🚀')} ${chalk.bold.white('Build, Deploy, and Manage AI Microservices')}
                   ${chalk.dim.cyan('https://github.com/adverant/nexus-cli')}
    `.trim();
  }
}

// Usage examples
const banner = new NexusBanner('1.0.0');

// Show compact banner for quick commands
banner.display({ variant: 'compact' });

// Show standard neural network banner
banner.display({ variant: 'standard', theme: 'neural' });

// Show full hexagonal banner
banner.display({ variant: 'full', theme: 'hexagon' });

// Minimal for help text
banner.display({ variant: 'minimal' });
```

---

## Usage Recommendations

### 1. **CLI Entry Point** (`src/index.ts`)
Use **minimal** or **compact** banner

### 2. **Help Command** (`nexus --help`)
Use **compact** banner

### 3. **Version Command** (`nexus --version`)
Use **standard** banner with version info

### 4. **Start/Deploy Commands**
Use **compact** banner to save space

### 5. **README.md Documentation**
Use **full** banner (hexagonal or neural)

### 6. **Error Messages**
Use **minimal** or no banner

---

## Plain Text Variants (No Colors)

### For Logs/CI/CD:
```
╔════════════════════════════════════════════════════════════╗
║  NEXUS CLI v1.0.0                                          ║
║  AI-Powered Microservices Orchestration                    ║
╚════════════════════════════════════════════════════════════╝
```

### For README (Markdown):
````markdown
```
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗      ║
    ║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝      ║
    ║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗      ║
    ║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║      ║
    ║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║      ║
    ║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝      ║
    ║                                                       ║
    ║          ⬡ AI-Powered Microservices Hub ⬡            ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
```
````

---

## Summary

**Recommended Default**: **Hexagonal Architecture (Full)** for main banner, **Neural Network (Standard)** for command outputs

**Key Design Elements**:
- Clean box-drawing characters (Unicode)
- Network topology visualization
- AI/neural network symbolism
- Professional color scheme (cyan, magenta, white)
- Multiple size variants for different contexts
- TypeScript/Node.js ready with chalk integration
- Scales well in terminals (mono-spaced fonts)

**Unique Features**:
- Hexagonal hub architecture (represents Nexus as central hub)
- Neural network visualization (AI intelligence)
- Microservices mesh topology
- Service discovery representation
- Modern, tech-forward aesthetic

All designs are production-ready and can be directly integrated into the Nexus CLI codebase.
