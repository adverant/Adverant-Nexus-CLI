/**
 * Environment Variable Sanitizer
 *
 * Filters and sanitizes environment variables before storing in sessions.
 * Prevents sensitive credentials (API keys, tokens, passwords) from being
 * written to disk in plain text.
 *
 * Security: Only allowlisted variables are preserved in session storage.
 */

/**
 * Allowlist of safe environment variables that can be stored in sessions.
 * These variables typically contain system configuration, not secrets.
 */
const SAFE_ENV_VARIABLES = new Set([
  // System paths and locations
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'TMPDIR',
  'PWD',

  // Locale and language settings
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LC_COLLATE',
  'LC_TIME',
  'LC_NUMERIC',
  'LC_MONETARY',
  'LC_MESSAGES',

  // Node.js environment
  'NODE_ENV',
  'NODE_OPTIONS',

  // Display and terminal
  'DISPLAY',
  'COLORTERM',
  'TERM_PROGRAM',
  'TERM_PROGRAM_VERSION',

  // Editor preferences
  'EDITOR',
  'VISUAL',

  // Build and development
  'CI',
  'BUILD_NUMBER',
  'BUILD_ID',
]);

/**
 * Prefixes for variables that are safe to store.
 * Variables starting with these prefixes are considered application-specific
 * and safe to persist.
 */
const SAFE_PREFIXES = ['NEXUS_'];

/**
 * Patterns for variables that should NEVER be stored, even if they match safe prefixes.
 * These represent secrets and credentials that must be excluded.
 */
const BLOCKED_PATTERNS = [
  /key/i, // API_KEY, AWS_ACCESS_KEY, etc.
  /secret/i, // SECRET, AWS_SECRET_ACCESS_KEY, etc.
  /token/i, // TOKEN, AUTH_TOKEN, etc.
  /password/i, // PASSWORD, DB_PASSWORD, etc.
  /credential/i, // CREDENTIAL, CREDENTIALS, etc.
  /auth/i, // AUTH, AUTHORIZATION, etc.
  /api_key/i,
  /access_key/i,
  /private/i,
  /passphrase/i,
];

/**
 * Checks if an environment variable key should be blocked due to security concerns.
 *
 * @param key - The environment variable key to check
 * @returns true if the variable contains sensitive data and should be blocked
 */
function isBlockedVariable(key: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Checks if an environment variable key is safe to store in sessions.
 *
 * A variable is considered safe if it either:
 * 1. Is in the explicit allowlist (SAFE_ENV_VARIABLES)
 * 2. Starts with a safe prefix (SAFE_PREFIXES) AND doesn't match blocked patterns
 *
 * @param key - The environment variable key to check
 * @returns true if the variable is safe to store
 */
function isSafeVariable(key: string): boolean {
  // Check explicit allowlist first
  if (SAFE_ENV_VARIABLES.has(key)) {
    return true;
  }

  // Check if it starts with a safe prefix
  const hasSafePrefix = SAFE_PREFIXES.some((prefix) => key.startsWith(prefix));

  // Even with safe prefix, block if it matches a sensitive pattern
  if (hasSafePrefix) {
    return !isBlockedVariable(key);
  }

  return false;
}

/**
 * Sanitizes environment variables by filtering out sensitive credentials.
 *
 * This function creates a new object containing only safe environment variables
 * based on the allowlist and prefix rules. Variables that might contain secrets
 * (API keys, tokens, passwords) are excluded.
 *
 * @param env - The environment variables object to sanitize (typically process.env)
 * @returns A new object containing only safe environment variables
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeEnvironment(process.env);
 * // sanitized will contain PATH, HOME, NEXUS_API_URL, etc.
 * // but NOT AWS_SECRET_KEY, DATABASE_PASSWORD, etc.
 * ```
 */
export function sanitizeEnvironment(
  env: Record<string, string | undefined>
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  let blockedCount = 0;

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue; // Skip undefined values
    }

    if (isSafeVariable(key)) {
      sanitized[key] = value;
    } else {
      blockedCount++;
    }
  }

  // Log summary for debugging (but don't log which specific variables were blocked)
  if (blockedCount > 0 && process.env.NODE_ENV !== 'test') {
    console.debug(
      `[Security] Filtered ${blockedCount} potentially sensitive environment variables from session storage`
    );
  }

  return sanitized;
}

/**
 * Gets a list of environment variable keys that would be blocked.
 * Useful for debugging and auditing.
 *
 * @param env - The environment variables object to check
 * @returns Array of blocked variable keys
 */
export function getBlockedVariables(
  env: Record<string, string | undefined>
): string[] {
  const blocked: string[] = [];

  for (const key of Object.keys(env)) {
    if (!isSafeVariable(key) && env[key] !== undefined) {
      blocked.push(key);
    }
  }

  return blocked.sort();
}

/**
 * Validates that no sensitive variables are present in a sanitized environment.
 * Useful for testing and security audits.
 *
 * @param env - The environment object to validate
 * @returns true if the environment contains no blocked variables
 */
export function validateSanitizedEnvironment(
  env: Record<string, string>
): boolean {
  for (const key of Object.keys(env)) {
    if (isBlockedVariable(key)) {
      return false;
    }
  }
  return true;
}

/**
 * Configuration for environment sanitization behavior.
 * Can be extended in the future for custom allowlists.
 */
export interface SanitizerConfig {
  /** Additional variable names to allow (beyond the default allowlist) */
  additionalSafeVariables?: string[];
  /** Additional prefixes to consider safe (beyond NEXUS_) */
  additionalSafePrefixes?: string[];
  /** Whether to log debug information about filtering */
  verbose?: boolean;
}

/**
 * Creates a custom sanitizer function with extended configuration.
 * Allows applications to define their own safe variables beyond the defaults.
 *
 * @param config - Configuration for the sanitizer
 * @returns A configured sanitize function
 *
 * @example
 * ```typescript
 * const customSanitize = createSanitizer({
 *   additionalSafeVariables: ['MY_APP_URL'],
 *   additionalSafePrefixes: ['MYAPP_'],
 * });
 *
 * const sanitized = customSanitize(process.env);
 * ```
 */
export function createSanitizer(config: SanitizerConfig = {}) {
  const extendedSafeVars = new Set([
    ...SAFE_ENV_VARIABLES,
    ...(config.additionalSafeVariables || []),
  ]);

  const extendedSafePrefixes = [
    ...SAFE_PREFIXES,
    ...(config.additionalSafePrefixes || []),
  ];

  return function customSanitize(
    env: Record<string, string | undefined>
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    let blockedCount = 0;

    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        continue;
      }

      const isSafe =
        extendedSafeVars.has(key) ||
        (extendedSafePrefixes.some((prefix) => key.startsWith(prefix)) &&
          !isBlockedVariable(key));

      if (isSafe) {
        sanitized[key] = value;
      } else {
        blockedCount++;
      }
    }

    if (config.verbose && blockedCount > 0) {
      console.debug(
        `[Security] Filtered ${blockedCount} environment variables`
      );
    }

    return sanitized;
  };
}
