/**
 * Logging Framework
 *
 * Centralized logging system with:
 * - Multiple log levels (trace, debug, info, warn, error)
 * - Configurable output (console, file, JSON)
 * - Context/metadata support
 * - Performance timing
 * - Quiet/verbose modes
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5,
}

/**
 * Log level names for display
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * Log level colors for console output
 */
const LOG_LEVEL_COLORS = {
  [LogLevel.TRACE]: chalk.gray,
  [LogLevel.DEBUG]: chalk.cyan,
  [LogLevel.INFO]: chalk.blue,
  [LogLevel.WARN]: chalk.yellow,
  [LogLevel.ERROR]: chalk.red,
  [LogLevel.SILENT]: chalk.dim,
};

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Enable file logging */
  logToFile?: boolean;
  /** Log file path */
  logFilePath?: string;
  /** Enable JSON output for machine parsing */
  jsonOutput?: boolean;
  /** Include timestamps in console output */
  showTimestamps?: boolean;
  /** Include log level in console output */
  showLevel?: boolean;
  /** Context object to include with all logs */
  defaultContext?: Record<string, any>;
}

/**
 * Logger class for centralized logging
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private logStream: fs.WriteStream | null = null;

  constructor(config: LoggerConfig = {}) {
    const logDir = path.join(os.homedir(), '.nexus', 'logs');

    this.config = {
      level: config.level ?? LogLevel.INFO,
      logToFile: config.logToFile ?? false,
      logFilePath: config.logFilePath ?? path.join(logDir, 'nexus-cli.log'),
      jsonOutput: config.jsonOutput ?? false,
      showTimestamps: config.showTimestamps ?? false,
      showLevel: config.showLevel ?? true,
      defaultContext: config.defaultContext ?? {},
    };

    if (this.config.logToFile) {
      this.initFileLogging();
    }
  }

  /**
   * Initialize file logging stream
   */
  private async initFileLogging(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.config.logFilePath));
      this.logStream = fs.createWriteStream(this.config.logFilePath, {
        flags: 'a',
        encoding: 'utf-8',
      });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.showTimestamps) {
      const timestamp = entry.timestamp.toISOString();
      parts.push(chalk.dim(timestamp));
    }

    // Log level
    if (this.config.showLevel) {
      const levelName = LOG_LEVEL_NAMES[entry.level];
      const colorFn = LOG_LEVEL_COLORS[entry.level];
      parts.push(colorFn(`[${levelName}]`));
    }

    // Message
    parts.push(entry.message);

    // Context (if present)
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(chalk.dim(JSON.stringify(entry.context)));
    }

    // Error (if present)
    if (entry.error) {
      parts.push('\n' + chalk.red(entry.error.stack || entry.error.message));
    }

    return parts.join(' ');
  }

  /**
   * Format log entry for JSON output
   */
  private formatJsonMessage(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: LOG_LEVEL_NAMES[entry.level],
      message: entry.message,
      ...(entry.context && { context: entry.context }),
      ...(entry.error && {
        error: {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        },
      }),
    });
  }

  /**
   * Write log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.config.defaultContext, ...context },
    };

    if (error) {
      entry.error = error;
    }

    // Console output
    if (this.config.jsonOutput) {
      console.log(this.formatJsonMessage(entry));
    } else {
      const formatted = this.formatConsoleMessage(entry);

      // Use appropriate console method
      switch (level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
          console.debug(formatted);
          break;
        default:
          console.log(formatted);
      }
    }

    // File output
    if (this.logStream && !this.logStream.destroyed) {
      const logLine = this.config.jsonOutput
        ? this.formatJsonMessage(entry)
        : `${entry.timestamp.toISOString()} [${LOG_LEVEL_NAMES[level]}] ${message}${
            entry.context ? ' ' + JSON.stringify(entry.context) : ''
          }${entry.error ? '\n' + entry.error.stack : ''}\n`;

      this.logStream.write(logLine);
    }
  }

  /**
   * Log trace message (most verbose)
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, errorOrContext?: Error | Record<string, any>): void {
    if (errorOrContext instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, errorOrContext);
    } else {
      this.log(LogLevel.ERROR, message, errorOrContext);
    }
  }

  /**
   * Log error with Error object
   */
  exception(error: Error, message?: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message || error.message, context, error);
  }

  /**
   * Create a child logger with additional default context
   */
  child(context: Record<string, any>): Logger {
    return new Logger({
      ...this.config,
      defaultContext: { ...this.config.defaultContext, ...context },
    });
  }

  /**
   * Time a function execution
   */
  async time<T>(
    label: string,
    fn: () => Promise<T> | T,
    context?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${label}`, context);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`Completed: ${label}`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${label}`, { ...context, duration: `${duration}ms` });
      throw error;
    }
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    if (this.logStream && !this.logStream.destroyed) {
      return new Promise((resolve, reject) => {
        this.logStream!.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger instance
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * Set global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Configure global logger from CLI flags
 */
export function configureFromFlags(flags: {
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
  logFile?: string;
  jsonOutput?: boolean;
}): void {
  let level = LogLevel.INFO;

  if (flags.quiet) {
    level = LogLevel.WARN;
  } else if (flags.debug) {
    level = LogLevel.DEBUG;
  } else if (flags.verbose) {
    level = LogLevel.TRACE;
  }

  const config: LoggerConfig = {
    level,
    logToFile: !!flags.logFile,
  };

  if (flags.verbose || flags.debug) {
    config.showTimestamps = true;
  }

  if (flags.logFile) {
    config.logFilePath = flags.logFile;
  }

  if (flags.jsonOutput) {
    config.jsonOutput = flags.jsonOutput;
  }

  globalLogger = new Logger(config);
}

/**
 * Convenience exports for global logger
 */
export const log = {
  trace: (message: string, context?: Record<string, any>) => getLogger().trace(message, context),
  debug: (message: string, context?: Record<string, any>) => getLogger().debug(message, context),
  info: (message: string, context?: Record<string, any>) => getLogger().info(message, context),
  warn: (message: string, context?: Record<string, any>) => getLogger().warn(message, context),
  error: (message: string, errorOrContext?: Error | Record<string, any>) =>
    getLogger().error(message, errorOrContext),
  exception: (error: Error, message?: string, context?: Record<string, any>) =>
    getLogger().exception(error, message, context),
};
