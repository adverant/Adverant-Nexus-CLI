# Logging Framework Migration Guide

This guide explains how to migrate from `console.*` calls to the new centralized logging framework.

## Quick Start

### Import the logger

```typescript
import { log, getLogger, LogLevel } from './core/logging/index.js';
```

### Basic usage (global logger)

```typescript
// Before
console.log('Service started');
console.warn('Connection slow');
console.error('Operation failed');

// After
log.info('Service started');
log.warn('Connection slow');
log.error('Operation failed');
```

### With context

```typescript
// Before
console.log('User logged in:', userId);
console.error('Failed to connect to', serviceName);

// After
log.info('User logged in', { userId });
log.error('Failed to connect', { service: serviceName });
```

### With errors

```typescript
// Before
console.error('Operation failed:', error.message);
console.error(error.stack);

// After
log.exception(error, 'Operation failed');
// or
log.error('Operation failed', error);
```

## Migration Patterns

### 1. Simple console.log → log.info

```typescript
// Before
console.log('Starting service discovery...');

// After
log.info('Starting service discovery...');
```

### 2. console.warn → log.warn

```typescript
// Before
console.warn(`Warning: Could not load config from ${path}`);

// After
log.warn('Could not load config', { path });
```

### 3. console.error → log.error

```typescript
// Before
console.error(`Error: ${error.message}`);

// After
log.error('Operation failed', error);
```

### 4. console.debug → log.debug

```typescript
// Before
if (verbose) {
  console.debug('Processing item:', item);
}

// After
log.debug('Processing item', { item });
```

### 5. Formatted messages with chalk

```typescript
// Before
console.log(chalk.green('✓ Success'));
console.log(chalk.red('✗ Failed'));

// After - chalk is handled internally
log.info('✓ Success');
log.error('✗ Failed');
```

### 6. Progress/status messages

```typescript
// Before
console.log(chalk.dim('Fetching data...'));

// After
log.debug('Fetching data...');
```

### 7. Error with stack trace

```typescript
// Before
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  console.error(error.stack);
}

// After
try {
  await operation();
} catch (error) {
  log.exception(error as Error, 'Operation failed');
}
```

### 8. Conditional logging (verbose/debug mode)

```typescript
// Before
if (options.verbose) {
  console.log('Detailed information...');
}

// After - logger handles this automatically
log.debug('Detailed information...');
// Will only show if log level is DEBUG or lower
```

### 9. Multiple related log lines

```typescript
// Before
console.log('Service:', serviceName);
console.log('Port:', port);
console.log('Status:', status);

// After
log.info('Service information', {
  service: serviceName,
  port,
  status,
});
```

### 10. Spinner/progress with logging

```typescript
// Before
const spinner = ora('Loading...').start();
try {
  await operation();
  spinner.succeed('Done');
} catch (error) {
  spinner.fail('Failed');
  console.error(error);
}

// After
const spinner = ora('Loading...').start();
try {
  await operation();
  spinner.succeed('Done');
  log.info('Operation completed successfully');
} catch (error) {
  spinner.fail('Failed');
  log.exception(error as Error, 'Operation failed');
}
```

## Creating Scoped Loggers

For modules that need consistent context:

```typescript
// At top of file
const logger = getLogger().child({ module: 'service-discovery' });

// Usage
logger.info('Discovering services');
logger.debug('Found service', { name: serviceName });
logger.error('Discovery failed', error);
```

## Timing Operations

```typescript
// Before
const start = Date.now();
await operation();
console.log(`Operation took ${Date.now() - start}ms`);

// After
await getLogger().time('Operation', async () => {
  await operation();
});
```

## CLI Integration

Update command files to support log level flags:

```typescript
import { configureFromFlags } from './core/logging/index.js';

command
  .option('--verbose', 'Enable verbose output')
  .option('--quiet', 'Suppress non-error output')
  .option('--debug', 'Enable debug output')
  .option('--log-file <path>', 'Write logs to file')
  .action(async (options) => {
    configureFromFlags(options);
    // ... rest of command
  });
```

## Log Levels

- **TRACE**: Most verbose, low-level operations
- **DEBUG**: Debugging information, detailed flow
- **INFO**: General informational messages (default)
- **WARN**: Warning messages
- **ERROR**: Error messages
- **SILENT**: No output

## Best Practices

1. **Use appropriate log levels**:
   - `trace`: Low-level details, loops, iterations
   - `debug`: Function entry/exit, state changes
   - `info`: High-level operations, user-facing messages
   - `warn`: Recoverable issues, deprecation warnings
   - `error`: Failures, exceptions

2. **Include context objects** instead of interpolating strings:
   ```typescript
   // Good
   log.error('Failed to connect', { host, port, timeout });

   // Avoid
   log.error(`Failed to connect to ${host}:${port} after ${timeout}ms`);
   ```

3. **Use log.exception() for Error objects**:
   ```typescript
   // Good
   log.exception(error, 'Operation failed', { userId });

   // Avoid
   log.error(`Operation failed: ${error.message}`);
   ```

4. **Don't log sensitive data**:
   ```typescript
   // Bad
   log.info('User authenticated', { password });

   // Good
   log.info('User authenticated', { userId, username });
   ```

5. **Keep user-facing output separate** from logging:
   ```typescript
   // User-facing (always show)
   console.log(chalk.green('✓ Service started successfully'));

   // Internal logging (respects log level)
   log.info('Service startup complete', { port, pid: process.pid });
   ```

## Migration Checklist

For each file:

- [ ] Import logging utilities
- [ ] Replace console.log → log.info (or log.debug for verbose)
- [ ] Replace console.warn → log.warn
- [ ] Replace console.error → log.error or log.exception
- [ ] Replace console.debug → log.debug
- [ ] Add context objects instead of string interpolation
- [ ] Remove verbose/debug conditionals (logger handles this)
- [ ] Update error handling to use log.exception
- [ ] Test with --verbose, --quiet, and --debug flags

## Files to Migrate (Priority Order)

1. **High Priority** - Core modules (30+ console calls):
   - `core/discovery/docker-parser.ts` (10+ calls)
   - `core/session/context-manager.ts`
   - `commands/services/*.ts` (8 files)

2. **Medium Priority** - Command handlers:
   - All files in `commands/` directory

3. **Low Priority** - Utility modules:
   - Helper functions, formatters

## Example: Complete File Migration

**Before:**
```typescript
export async function startService(name: string): Promise<void> {
  console.log(`Starting ${name}...`);

  try {
    const result = await dockerStart(name);
    console.log(chalk.green(`✓ Started ${name}`));
    console.debug('Result:', result);
  } catch (error) {
    console.error(chalk.red(`✗ Failed to start ${name}`));
    console.error(error);
    throw error;
  }
}
```

**After:**
```typescript
import { log } from '../core/logging/index.js';

export async function startService(name: string): Promise<void> {
  log.info('Starting service', { name });

  try {
    const result = await dockerStart(name);
    console.log(chalk.green(`✓ Started ${name}`)); // User-facing output
    log.debug('Service started successfully', { name, result });
  } catch (error) {
    console.error(chalk.red(`✗ Failed to start ${name}`)); // User-facing error
    log.exception(error as Error, 'Failed to start service', { name });
    throw error;
  }
}
```

## Testing

After migration, test with different log levels:

```bash
# Normal output (INFO level)
nexus services status

# Verbose output (TRACE level)
nexus services status --verbose

# Quiet output (WARN level only)
nexus services status --quiet

# Debug output (DEBUG level)
nexus services status --debug

# JSON output for parsing
nexus services status --json-output

# Log to file
nexus services status --log-file ./nexus.log
```
