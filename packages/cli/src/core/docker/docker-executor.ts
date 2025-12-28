/**
 * Docker Command Executor
 *
 * Provides async wrappers for docker CLI commands, replacing blocking execSync calls.
 * This prevents UI freezing and allows for proper progress indication.
 *
 * Key Improvements:
 * - Non-blocking async execution
 * - Proper error handling with detailed error types
 * - Support for command timeouts
 * - Ability to cancel long-running operations
 * - Better integration with ora spinners
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Default timeout for docker commands (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Error types for docker command failures
 */
export enum DockerErrorType {
  NOT_FOUND = 'NOT_FOUND', // Container/image not found
  NOT_RUNNING = 'NOT_RUNNING', // Docker daemon not running
  PERMISSION_DENIED = 'PERMISSION_DENIED', // Permission issues
  TIMEOUT = 'TIMEOUT', // Command timed out
  NETWORK_ERROR = 'NETWORK_ERROR', // Network-related issues
  INVALID_COMMAND = 'INVALID_COMMAND', // Malformed docker command
  UNKNOWN = 'UNKNOWN', // Other errors
}

/**
 * Custom error class for docker command failures
 */
export class DockerExecutionError extends Error {
  constructor(
    message: string,
    public readonly type: DockerErrorType,
    public readonly command: string,
    public readonly stderr?: string,
    public readonly exitCode?: number
  ) {
    super(message);
    this.name = 'DockerExecutionError';
    Error.captureStackTrace(this, DockerExecutionError);
  }
}

/**
 * Options for docker command execution
 */
export interface DockerExecOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Working directory for command execution */
  cwd?: string;
  /** Environment variables to pass to the command */
  env?: NodeJS.ProcessEnv;
  /** Whether to ignore errors and return empty result */
  ignoreErrors?: boolean;
}

/**
 * Result of a docker command execution
 */
export interface DockerExecResult {
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
  /** Exit code (0 for success) */
  exitCode: number;
  /** Whether the command succeeded */
  success: boolean;
}

/**
 * Classifies docker error based on error message and exit code
 */
function classifyDockerError(
  stderr: string,
  exitCode: number | null
): DockerErrorType {
  const stderrLower = stderr.toLowerCase();

  // Check for specific error patterns
  if (stderrLower.includes('no such container') || stderrLower.includes('no such image')) {
    return DockerErrorType.NOT_FOUND;
  }

  if (
    stderrLower.includes('cannot connect to the docker daemon') ||
    stderrLower.includes('is the docker daemon running')
  ) {
    return DockerErrorType.NOT_RUNNING;
  }

  if (
    stderrLower.includes('permission denied') ||
    stderrLower.includes('access denied') ||
    exitCode === 126
  ) {
    return DockerErrorType.PERMISSION_DENIED;
  }

  if (
    stderrLower.includes('timeout') ||
    stderrLower.includes('timed out')
  ) {
    return DockerErrorType.TIMEOUT;
  }

  if (
    stderrLower.includes('network') ||
    stderrLower.includes('connection refused')
  ) {
    return DockerErrorType.NETWORK_ERROR;
  }

  if (
    stderrLower.includes('invalid') ||
    stderrLower.includes('unknown flag') ||
    exitCode === 125
  ) {
    return DockerErrorType.INVALID_COMMAND;
  }

  return DockerErrorType.UNKNOWN;
}

/**
 * Executes a docker command asynchronously
 *
 * @param command - The docker command to execute (without 'docker' prefix)
 * @param options - Execution options
 * @returns Promise resolving to command result
 * @throws DockerExecutionError if command fails
 *
 * @example
 * ```typescript
 * const result = await executeDockerCommand('ps -a --format json');
 * console.log(result.stdout);
 * ```
 */
export async function executeDockerCommand(
  command: string,
  options: DockerExecOptions = {}
): Promise<DockerExecResult> {
  const {
    timeout = DEFAULT_TIMEOUT,
    cwd,
    env,
    ignoreErrors = false,
  } = options;

  const fullCommand = `docker ${command}`;

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout,
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      success: true,
    };
  } catch (error: any) {
    const stderr = error.stderr || error.message || '';
    const exitCode = error.code || null;

    if (ignoreErrors) {
      return {
        stdout: '',
        stderr,
        exitCode: exitCode || 1,
        success: false,
      };
    }

    // Classify the error
    const errorType = classifyDockerError(stderr, exitCode);

    // Create descriptive error message
    let errorMessage = `Docker command failed: ${fullCommand}`;
    switch (errorType) {
      case DockerErrorType.NOT_FOUND:
        errorMessage = `Container or image not found: ${command}`;
        break;
      case DockerErrorType.NOT_RUNNING:
        errorMessage = 'Docker daemon is not running. Please start Docker and try again.';
        break;
      case DockerErrorType.PERMISSION_DENIED:
        errorMessage = 'Permission denied. Try running with sudo or check Docker permissions.';
        break;
      case DockerErrorType.TIMEOUT:
        errorMessage = `Docker command timed out after ${timeout}ms: ${command}`;
        break;
      case DockerErrorType.NETWORK_ERROR:
        errorMessage = `Network error while executing docker command: ${command}`;
        break;
      case DockerErrorType.INVALID_COMMAND:
        errorMessage = `Invalid docker command: ${command}`;
        break;
    }

    throw new DockerExecutionError(
      errorMessage,
      errorType,
      fullCommand,
      stderr,
      exitCode
    );
  }
}

/**
 * Executes a docker inspect command and returns parsed JSON
 *
 * @param target - Container or image name/ID to inspect
 * @param format - Optional format string for docker inspect
 * @returns Promise resolving to parsed JSON data
 * @throws DockerExecutionError if command fails
 *
 * @example
 * ```typescript
 * const container = await dockerInspect('my-container');
 * console.log(container.State.Running);
 * ```
 */
export async function dockerInspect<T = any>(
  target: string,
  format?: string
): Promise<T> {
  const formatArg = format ? `--format '${format}'` : '--format json';
  const result = await executeDockerCommand(`inspect ${target} ${formatArg}`);

  try {
    // docker inspect returns an array, get first element
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (error) {
    throw new DockerExecutionError(
      `Failed to parse docker inspect output for ${target}`,
      DockerErrorType.INVALID_COMMAND,
      `docker inspect ${target}`,
      'Invalid JSON output'
    );
  }
}

/**
 * Checks if a container is running
 *
 * @param containerName - Name or ID of the container
 * @returns Promise resolving to true if running, false otherwise
 *
 * @example
 * ```typescript
 * if (await isContainerRunning('my-app')) {
 *   console.log('Container is running');
 * }
 * ```
 */
export async function isContainerRunning(
  containerName: string
): Promise<boolean> {
  try {
    const container = await dockerInspect(containerName);
    return container?.State?.Running === true;
  } catch (error) {
    if (error instanceof DockerExecutionError && error.type === DockerErrorType.NOT_FOUND) {
      return false;
    }
    throw error;
  }
}

/**
 * Gets the status of a container
 *
 * @param containerName - Name or ID of the container
 * @returns Promise resolving to container status object
 *
 * @example
 * ```typescript
 * const status = await getContainerStatus('my-app');
 * console.log(status.State, status.Health);
 * ```
 */
export async function getContainerStatus(containerName: string): Promise<{
  State: string;
  Running: boolean;
  Paused: boolean;
  Restarting: boolean;
  Dead: boolean;
  Status: string;
  Health?: {
    Status: string;
    FailingStreak: number;
  };
}> {
  const container = await dockerInspect(containerName);

  const result: {
    State: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    Dead: boolean;
    Status: string;
    Health?: {
      Status: string;
      FailingStreak: number;
    };
  } = {
    State: container.State?.Status || 'unknown',
    Running: container.State?.Running || false,
    Paused: container.State?.Paused || false,
    Restarting: container.State?.Restarting || false,
    Dead: container.State?.Dead || false,
    Status: container.State?.Status || 'unknown',
  };

  if (container.State?.Health) {
    result.Health = {
      Status: container.State.Health.Status,
      FailingStreak: container.State.Health.FailingStreak || 0,
    };
  }

  return result;
}

/**
 * Lists docker containers
 *
 * @param options - Options for listing containers
 * @returns Promise resolving to array of container information
 *
 * @example
 * ```typescript
 * const containers = await listContainers({ all: true });
 * containers.forEach(c => console.log(c.name, c.status));
 * ```
 */
export async function listContainers(options: {
  all?: boolean;
  format?: string;
} = {}): Promise<any[]> {
  const { all = false, format = 'json' } = options;
  const allFlag = all ? '-a' : '';

  const result = await executeDockerCommand(`ps ${allFlag} --format ${format}`);

  if (!result.stdout) {
    return [];
  }

  try {
    // Parse JSON lines format
    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (error) {
    // If not JSON, return raw lines
    return result.stdout.split('\n').filter(line => line.trim());
  }
}

/**
 * Starts a docker container
 *
 * @param containerName - Name or ID of the container
 * @param options - Execution options
 * @returns Promise resolving to command result
 *
 * @example
 * ```typescript
 * await startContainer('my-app');
 * ```
 */
export async function startContainer(
  containerName: string,
  options?: DockerExecOptions
): Promise<DockerExecResult> {
  return executeDockerCommand(`start ${containerName}`, options);
}

/**
 * Stops a docker container
 *
 * @param containerName - Name or ID of the container
 * @param timeout - Timeout in seconds before killing (default: 10)
 * @param options - Execution options
 * @returns Promise resolving to command result
 *
 * @example
 * ```typescript
 * await stopContainer('my-app', 5);
 * ```
 */
export async function stopContainer(
  containerName: string,
  timeout: number = 10,
  options?: DockerExecOptions
): Promise<DockerExecResult> {
  return executeDockerCommand(`stop -t ${timeout} ${containerName}`, options);
}

/**
 * Restarts a docker container
 *
 * @param containerName - Name or ID of the container
 * @param timeout - Timeout in seconds before killing (default: 10)
 * @param options - Execution options
 * @returns Promise resolving to command result
 *
 * @example
 * ```typescript
 * await restartContainer('my-app');
 * ```
 */
export async function restartContainer(
  containerName: string,
  timeout: number = 10,
  options?: DockerExecOptions
): Promise<DockerExecResult> {
  return executeDockerCommand(`restart -t ${timeout} ${containerName}`, options);
}

/**
 * Gets logs from a docker container
 *
 * @param containerName - Name or ID of the container
 * @param options - Log options
 * @returns Promise resolving to log output
 *
 * @example
 * ```typescript
 * const logs = await getContainerLogs('my-app', { tail: 100 });
 * console.log(logs);
 * ```
 */
export async function getContainerLogs(
  containerName: string,
  options: {
    tail?: number;
    since?: string;
    timestamps?: boolean;
    follow?: boolean;
  } = {}
): Promise<string> {
  const { tail, since, timestamps } = options;

  let command = `logs ${containerName}`;

  if (tail) {
    command += ` --tail ${tail}`;
  }
  if (since) {
    command += ` --since ${since}`;
  }
  if (timestamps) {
    command += ' --timestamps';
  }

  const result = await executeDockerCommand(command);
  return result.stdout;
}

/**
 * Executes a command inside a running container
 *
 * @param containerName - Name or ID of the container
 * @param command - Command to execute inside the container
 * @param options - Execution options
 * @returns Promise resolving to command result
 *
 * @example
 * ```typescript
 * const result = await execInContainer('my-app', 'ls -la');
 * console.log(result.stdout);
 * ```
 */
export async function execInContainer(
  containerName: string,
  command: string,
  options?: DockerExecOptions
): Promise<DockerExecResult> {
  return executeDockerCommand(`exec ${containerName} ${command}`, options);
}

/**
 * Gets port mappings for a container
 *
 * @param containerName - Name or ID of the container
 * @returns Promise resolving to port mapping object
 *
 * @example
 * ```typescript
 * const ports = await getContainerPorts('my-app');
 * console.log(ports); // { "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }] }
 * ```
 */
export async function getContainerPorts(
  containerName: string
): Promise<Record<string, any>> {
  const container = await dockerInspect(containerName);
  return container?.NetworkSettings?.Ports || {};
}
