/**
 * Nexus CLI Banner Implementation Example
 *
 * This file demonstrates how to integrate the ASCII art banners
 * into your Nexus CLI application.
 *
 * Installation:
 * npm install chalk
 *
 * Usage:
 * import { NexusBanner } from './utils/banner';
 * const banner = new NexusBanner('1.0.0');
 * banner.display({ variant: 'standard', theme: 'neural' });
 */

import chalk from 'chalk';

export interface BannerOptions {
  variant?: 'compact' | 'standard' | 'full' | 'minimal';
  theme?: 'neural' | 'mesh' | 'hexagon' | 'network';
  showVersion?: boolean;
  showTagline?: boolean;
  colorEnabled?: boolean;
}

export class NexusBanner {
  constructor(private version: string) {}

  /**
   * Display the banner with specified options
   */
  display(options: BannerOptions = {}): void {
    const {
      variant = 'standard',
      theme = 'hexagon',
      showVersion = true,
      showTagline = true,
      colorEnabled = true,
    } = options;

    // Disable colors if requested (for CI/CD environments)
    if (!colorEnabled) {
      chalk.level = 0;
    }

    let banner: string;

    switch (variant) {
      case 'minimal':
        banner = this.minimal();
        break;
      case 'compact':
        banner = this.compact();
        break;
      case 'standard':
        banner = this.getStandardBanner(theme);
        break;
      case 'full':
        banner = this.getFullBanner(theme);
        break;
      default:
        banner = this.getStandardBanner(theme);
    }

    console.log(banner);

    if (showTagline && variant !== 'full' && variant !== 'compact') {
      console.log(chalk.gray('Intelligent Service Management for Modern Applications'));
      console.log();
    }
  }

  /**
   * Get banner based on theme for standard size
   */
  private getStandardBanner(theme: string): string {
    switch (theme) {
      case 'neural':
        return this.neuralStandard();
      case 'mesh':
        return this.meshStandard();
      case 'network':
        return this.networkStandard();
      default:
        return this.neuralStandard();
    }
  }

  /**
   * Get banner based on theme for full size
   */
  private getFullBanner(theme: string): string {
    switch (theme) {
      case 'neural':
        return this.neuralFull();
      case 'hexagon':
        return this.hexagonFull();
      case 'network':
        return this.networkFull();
      default:
        return this.hexagonFull();
    }
  }

  /**
   * Minimal banner (1 line)
   * Best for: errors, logs, CI/CD
   */
  private minimal(): string {
    return `
${chalk.cyan('⬡')} ${chalk.bold.white('NEXUS CLI')}  ${chalk.cyan('⬡')}  ${chalk.gray('AI-Powered Microservices')}  ${chalk.cyan('⬡')}  ${chalk.gray(`v${this.version}`)}
${chalk.cyan('━'.repeat(80))}
    `.trim();
  }

  /**
   * Compact banner (3-4 lines)
   * Best for: help text, quick commands
   */
  private compact(): string {
    return `
${chalk.cyan('╔═══╗ ╔═╗  ╔═══╗ ╔╗  ╔╗ ╔╗  ╔╗ ╔═══╗')}
${chalk.cyan('║ ╔═╝ ║ ║  ║ ╔═╝ ║╚╗╔╝║ ║║  ║║ ║ ╔═╝')}
${chalk.cyan('║ ╚═╗ ║ ╚══╝ ╚═╗ ╚═╝ ╔╝ ║╚══╝║ ║ ╚═╗')}  ${chalk.gray('AI-Powered Microservices CLI')}
${chalk.cyan('╚═══╝ ╚════╝ ╚═══╝   ╚══╝ ╚════╝ ╚═══╝')}  ${chalk.gray(`v${this.version}`)}
    `.trim();
  }

  /**
   * Standard Neural Network banner (6-7 lines)
   * Best for: version command, main outputs
   */
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

  /**
   * Standard Mesh banner (12 lines)
   * Best for: showing service architecture
   */
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

  /**
   * Standard Network banner
   */
  private networkStandard(): string {
    return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.bold.white('╔╗  ╔╗ ╔═══╗ ╔╗  ╔╗ ╔╗  ╔╗ ╔═══╗')}     ${chalk.gray('╔═══╗ ╔╗   ╔══╗')} ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.bold.white('║║  ║║ ║╔══╝ ║╚╗╔╝║ ║║  ║║ ║╔══╝')}     ${chalk.gray('║╔═╗║ ║║   ╚╗╔╝')} ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.bold.white('║╚══╝║ ║╚══╗ ╚╗╚╝╔╝ ║║  ║║ ║╚══╗')}     ${chalk.gray('║║ ║║ ║║    ║║')}  ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.bold.white('╚════╝ ╚═══╝  ╚══╝  ╚╝  ╚╝ ╚═══╝')}     ${chalk.gray('╚╝ ╚╝ ╚╝    ╚╝')}  ${chalk.cyan('║')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.magenta('⬡━━━⬡━━━⬡')}  ${chalk.gray('AI-Powered Microservices Orchestration')}  ${chalk.cyan('║')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
                              ${chalk.dim(`v${this.version}`)}
    `.trim();
  }

  /**
   * Full Hexagonal Architecture banner (Recommended for README)
   */
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

  /**
   * Full Neural Network banner
   */
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

  /**
   * Full Network Architecture banner
   */
  private networkFull(): string {
    return `
${chalk.cyan('╔════════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                            ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('███╗   ██╗')} ${chalk.bold.white('███████╗')} ${chalk.bold.white('██╗  ██╗')} ${chalk.bold.white('██╗   ██╗')} ${chalk.bold.white('███████╗')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('████╗  ██║')} ${chalk.bold.white('██╔════╝')} ${chalk.bold.white('╚██╗██╔╝')} ${chalk.bold.white('██║   ██║')} ${chalk.bold.white('██╔════╝')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.cyan('██╔██╗ ██║')} ${chalk.bold.cyan('█████╗')}   ${chalk.bold.cyan('╚███╔╝')}  ${chalk.bold.cyan('██║   ██║')} ${chalk.bold.cyan('███████╗')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.cyan('██║╚██╗██║')} ${chalk.bold.cyan('██╔══╝')}   ${chalk.bold.cyan('██╔██╗')}  ${chalk.bold.cyan('██║   ██║')} ${chalk.bold.cyan('╚════██║')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.cyan('██║ ╚████║')} ${chalk.bold.cyan('███████╗')} ${chalk.bold.cyan('██╔╝ ██╗')} ${chalk.bold.cyan('╚██████╔╝')} ${chalk.bold.cyan('███████║')}    ${chalk.gray('╔═══════════╗')}        ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('╚═╝  ╚═══╝')} ${chalk.bold.white('╚══════╝')} ${chalk.bold.white('╚═╝  ╚═╝')}  ${chalk.bold.white('╚═════╝')}  ${chalk.bold.white('╚══════╝')}    ${chalk.gray(`║ CLI v${this.version.padEnd(6)} ║`)}        ${chalk.cyan('║')}
${chalk.cyan('║')}                                                       ${chalk.gray('╚═══════════╝')}        ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('┌─────────────────────────────────────────────────────────────────┐')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                 ${chalk.yellow('🧠')} ${chalk.bold.white('AI-Powered Microservices Orchestration')}        ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                                                                  ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}     ${chalk.gray('╭─────╮      ╭─────╮      ╭─────╮      ╭─────╮')}              ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}     ${chalk.gray('│')} ${chalk.green('API')} ${chalk.yellow('○')}${chalk.gray('──────')}${chalk.yellow('○')} ${chalk.blue('Auth')}${chalk.yellow('○')}${chalk.gray('──────')}${chalk.yellow('○')}${chalk.blue('Graph')}${chalk.yellow('○')}${chalk.gray('──────')}${chalk.yellow('○')} ${chalk.green('Mage')}${chalk.gray('│')}              ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}     ${chalk.gray('╰─────╯      ╰─────╯      ╰─────╯      ╰─────╯')}              ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}        ${chalk.gray('║            ║            ║            ║')}                  ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}        ${chalk.gray('╚════════════╩════════════╩════════════╝')}                  ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('│')}                    ${chalk.white('Unified Nexus Network')}                         ${chalk.magenta('│')}     ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.magenta('└─────────────────────────────────────────────────────────────────┘')}     ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                            ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.white('GraphRAG')} ${chalk.gray('•')} ${chalk.white('MageAgent')} ${chalk.gray('•')} ${chalk.white('Authentication')} ${chalk.gray('•')} ${chalk.white('API Gateway')} ${chalk.gray('•')} ${chalk.white('PostgreSQL')}         ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.white('Redis')} ${chalk.gray('•')} ${chalk.white('Neo4j')} ${chalk.gray('•')} ${chalk.white('Qdrant')} ${chalk.gray('•')} ${chalk.white('Docker Compose')} ${chalk.gray('•')} ${chalk.white('TypeScript')} ${chalk.gray('•')} ${chalk.white('Node.js')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                            ${chalk.cyan('║')}
${chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝')}

          ${chalk.gray('Intelligent Service Management for Modern Applications')}
                    ${chalk.dim.cyan('https://github.com/adverant/nexus-cli')}
    `.trim();
  }
}

// ============================================================================
//                            USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: CLI Entry Point
 */
export function showWelcomeBanner() {
  const banner = new NexusBanner('1.0.0');
  banner.display({ variant: 'minimal' });
}

/**
 * Example 2: Help Command
 */
export function showHelpBanner() {
  const banner = new NexusBanner('1.0.0');
  banner.display({ variant: 'compact', showTagline: false });
}

/**
 * Example 3: Version Command
 */
export function showVersionBanner() {
  const banner = new NexusBanner('1.0.0');
  banner.display({ variant: 'standard', theme: 'neural', showTagline: true });
}

/**
 * Example 4: README / Documentation
 */
export function showFullBanner() {
  const banner = new NexusBanner('1.0.0');
  banner.display({ variant: 'full', theme: 'hexagon', showTagline: false });
}

/**
 * Example 5: CI/CD Environment (no colors)
 */
export function showCIBanner() {
  const banner = new NexusBanner('1.0.0');
  banner.display({ variant: 'minimal', colorEnabled: false });
}

/**
 * Example 6: Dynamic version from package.json
 */
export function showDynamicBanner() {
  // In real implementation:
  // import { version } from '../package.json';
  const version = '1.0.0';
  const banner = new NexusBanner(version);
  banner.display({ variant: 'standard', theme: 'neural' });
}

// ============================================================================
//                         INTEGRATION PATTERNS
// ============================================================================

/**
 * Pattern 1: Command-specific banners
 */
export const BANNER_CONFIGS = {
  welcome: { variant: 'minimal' as const },
  help: { variant: 'compact' as const, showTagline: false },
  version: { variant: 'standard' as const, theme: 'neural' as const },
  start: { variant: 'compact' as const },
  deploy: { variant: 'standard' as const, theme: 'mesh' as const },
  status: { variant: 'minimal' as const },
  logs: { variant: 'minimal' as const, showTagline: false },
  error: { variant: 'minimal' as const, colorEnabled: false },
};

/**
 * Pattern 2: Environment-aware banner
 */
export function showEnvironmentBanner(env: 'development' | 'production' | 'ci') {
  const banner = new NexusBanner('1.0.0');

  const config = {
    development: { variant: 'standard' as const, theme: 'neural' as const },
    production: { variant: 'compact' as const, showTagline: false },
    ci: { variant: 'minimal' as const, colorEnabled: false },
  };

  banner.display(config[env]);
}

/**
 * Pattern 3: Conditional banner based on TTY
 */
export function showSmartBanner() {
  const banner = new NexusBanner('1.0.0');
  const isTTY = process.stdout.isTTY;

  if (!isTTY) {
    // Non-interactive environment (CI/CD, pipes)
    banner.display({ variant: 'minimal', colorEnabled: false });
  } else {
    // Interactive terminal
    banner.display({ variant: 'standard', theme: 'neural' });
  }
}

// ============================================================================
//                         COMMANDER.JS INTEGRATION
// ============================================================================

/**
 * Example integration with Commander.js
 */
/*
import { Command } from 'commander';

const program = new Command();
const banner = new NexusBanner('1.0.0');

program
  .name('nexus')
  .description('AI-Powered Microservices Orchestration CLI')
  .version('1.0.0', '-v, --version', 'Show version')
  .hook('preAction', () => {
    banner.display(BANNER_CONFIGS.welcome);
  });

program
  .command('start')
  .description('Start Nexus services')
  .action(() => {
    banner.display(BANNER_CONFIGS.start);
    // ... start logic
  });

program
  .command('deploy')
  .description('Deploy services')
  .action(() => {
    banner.display(BANNER_CONFIGS.deploy);
    // ... deploy logic
  });

program.parse();
*/

// ============================================================================
//                         EXPORT FOR EXTERNAL USE
// ============================================================================

export default NexusBanner;
