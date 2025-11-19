#!/usr/bin/env node
/**
 * Nexus CLI - Entry Point
 *
 * World-class command-line interface for the Adverant-Nexus platform
 */

import { runCLI } from './cli.js';
import { displayBanner } from './utils/banner.js';
import chalk from 'chalk';

// Display banner on startup (minimal variant)
const showBanner = !process.argv.includes('--no-banner') && process.stdout.isTTY;

async function main(): Promise<void> {
  try {
    // Show banner for interactive terminals
    if (showBanner) {
      displayBanner('3.0.0', {
        variant: 'minimal',
        theme: 'hexagon',
        colored: true,
        showVersion: true,
        showTagline: false,
      });
    }

    // Run the CLI
    await runCLI();
  } catch (error: any) {
    // Global error handler
    console.error(chalk.red('\n✗ Fatal Error:\n'));

    if (error.code) {
      console.error(chalk.red(`  Code: ${error.code}`));
    }

    console.error(chalk.red(`  ${error.message}\n`));

    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error(chalk.dim(error.stack));
    } else {
      console.error(chalk.dim('  Run with DEBUG=1 or VERBOSE=1 for stack trace\n'));
    }

    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  console.error(chalk.red('\n✗ Unhandled Promise Rejection:\n'));
  console.error(chalk.red(`  ${reason?.message || reason}\n`));

  if (reason?.stack && (process.env.DEBUG || process.env.VERBOSE)) {
    console.error(chalk.dim(reason.stack));
  }

  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error(chalk.red('\n✗ Uncaught Exception:\n'));
  console.error(chalk.red(`  ${error.message}\n`));

  if (error.stack && (process.env.DEBUG || process.env.VERBOSE)) {
    console.error(chalk.dim(error.stack));
  }

  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n✓ Gracefully shutting down...\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n✓ Received SIGTERM, shutting down...\n'));
  process.exit(0);
});

// Run the CLI
main();
