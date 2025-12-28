/**
 * Configuration Manager for Nexus CLI
 *
 * Handles loading, merging, and managing configuration from multiple sources:
 * - Global config (~/.nexus/config.toml)
 * - Workspace config (.nexus.toml)
 * - Environment variables
 * - Command line arguments
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { z } from 'zod';
import type {
  NexusConfig,
  GlobalConfig,
  Profile,
} from '@adverant-nexus/types';
import {
  NexusConfigSchema,
  GlobalConfigSchema,
} from '@adverant-nexus/types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: NexusConfig = {
  services: {
    apiUrl: 'http://localhost:9092',
    mcpUrl: 'http://localhost:9000',
    timeout: 30000,
    retries: 3,
  },
  defaults: {
    outputFormat: 'text',
    streaming: true,
    verbose: false,
    quiet: false,
  },
  agent: {
    maxIterations: 20,
    autoApproveSafe: false,
    workspace: '.',
  },
  plugins: {
    enabled: [],
    disabled: [],
    autoUpdate: false,
  },
  mcp: {
    autoStore: true,
    memoryTags: [],
    healthCheckInterval: 60000,
  },
};

/**
 * Configuration error class
 */
export class ConfigurationError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Configuration Manager
 */
export class ConfigManager {
  private readonly configDir: string;
  private readonly globalConfigFile: string;
  private readonly workspaceConfigFile: string = '.nexus.toml';

  private mergedConfig: NexusConfig | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.nexus');
    this.globalConfigFile = path.join(this.configDir, 'config.toml');
  }

  /**
   * Initialize configuration directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.ensureDir(path.join(this.configDir, 'profiles'));
      await fs.ensureDir(path.join(this.configDir, 'plugins'));
      await fs.ensureDir(path.join(this.configDir, 'cache'));
      await fs.ensureDir(path.join(this.configDir, 'logs'));

      // Create default global config if it doesn't exist
      if (!(await fs.pathExists(this.globalConfigFile))) {
        const defaultGlobalConfig: GlobalConfig = {
          profiles: [
            {
              name: 'default',
              config: DEFAULT_CONFIG,
              default: true,
            },
          ],
          currentProfile: 'default',
          pluginDirectory: path.join(this.configDir, 'plugins'),
          cacheDirectory: path.join(this.configDir, 'cache'),
          updateCheck: true,
          telemetry: false,
        };
        await this.saveGlobalConfig(defaultGlobalConfig);
      }
    } catch (error) {
      throw new ConfigurationError(
        `Failed to initialize configuration directory: ${error instanceof Error ? error.message : String(error)}`,
        { configDir: this.configDir }
      );
    }
  }

  /**
   * Load global configuration
   */
  async loadGlobalConfig(): Promise<GlobalConfig> {
    try {
      if (!(await fs.pathExists(this.globalConfigFile))) {
        await this.initialize();
      }

      const content = await fs.readFile(this.globalConfigFile, 'utf-8');
      const parsed = yaml.parse(content);
      const validated = GlobalConfigSchema.parse(parsed) as GlobalConfig;

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid global configuration: ${error.errors.map((e) => e.message).join(', ')}`,
          { errors: error.errors }
        );
      }
      throw new ConfigurationError(
        `Failed to load global configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save global configuration
   */
  async saveGlobalConfig(config: GlobalConfig): Promise<void> {
    try {
      const validated = GlobalConfigSchema.parse(config) as GlobalConfig;
      const content = yaml.stringify(validated);
      await fs.writeFile(this.globalConfigFile, content, 'utf-8');
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid global configuration: ${error.errors.map((e) => e.message).join(', ')}`,
          { errors: error.errors }
        );
      }
      throw new ConfigurationError(
        `Failed to save global configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load workspace configuration
   */
  async loadWorkspaceConfig(cwd?: string): Promise<NexusConfig | null> {
    const workingDir = cwd || process.cwd();
    const configPath = path.join(workingDir, this.workspaceConfigFile);

    try {
      if (!(await fs.pathExists(configPath))) {
        return null;
      }

      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = yaml.parse(content);
      const validated = NexusConfigSchema.parse(parsed) as NexusConfig;

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid workspace configuration: ${error.errors.map((e) => e.message).join(', ')}`,
          { configPath, errors: error.errors }
        );
      }
      console.warn(`Failed to load workspace config: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get current profile configuration
   */
  async getCurrentProfile(): Promise<Profile> {
    const globalConfig = await this.loadGlobalConfig();
    const profileName = globalConfig.currentProfile || 'default';

    const profile = globalConfig.profiles.find((p) => p.name === profileName);
    if (!profile) {
      throw new ConfigurationError(`Profile '${profileName}' not found`, {
        profileName,
        availableProfiles: globalConfig.profiles.map((p) => p.name),
      });
    }

    return profile;
  }

  /**
   * Get merged configuration (workspace overrides profile)
   */
  async getConfig(cwd?: string): Promise<NexusConfig> {
    if (this.mergedConfig) {
      return this.mergedConfig;
    }

    // Load profile config
    const profile = await this.getCurrentProfile();
    let config = profile.config;

    // Merge with workspace config if available
    const workspaceConfig = await this.loadWorkspaceConfig(cwd);
    if (workspaceConfig) {
      config = this.mergeConfigs(config, workspaceConfig);
    }

    // Apply environment variables
    config = this.applyEnvironmentVariables(config);

    this.mergedConfig = config;
    return config;
  }

  /**
   * Merge two configurations (second overrides first)
   */
  private mergeConfigs(base: NexusConfig, override: NexusConfig): NexusConfig {
    return {
      workspace: { ...base.workspace, ...override.workspace },
      services: { ...base.services, ...override.services },
      auth: { ...base.auth, ...override.auth },
      defaults: { ...base.defaults, ...override.defaults },
      agent: { ...base.agent, ...override.agent },
      plugins: {
        ...(override.plugins?.enabled && { enabled: override.plugins.enabled }),
        ...(override.plugins?.disabled && { disabled: override.plugins.disabled }),
        ...(override.plugins?.autoUpdate !== undefined && { autoUpdate: override.plugins.autoUpdate }),
        ...(!override.plugins?.enabled && base.plugins?.enabled && { enabled: base.plugins.enabled }),
        ...(!override.plugins?.disabled && base.plugins?.disabled && { disabled: base.plugins.disabled }),
        ...((override.plugins?.autoUpdate === undefined) && base.plugins?.autoUpdate !== undefined && { autoUpdate: base.plugins.autoUpdate }),
      },
      mcp: { ...base.mcp, ...override.mcp },
      shortcuts: [...(base.shortcuts || []), ...(override.shortcuts || [])],
    };
  }

  /**
   * Apply environment variables to configuration
   */
  private applyEnvironmentVariables(config: NexusConfig): NexusConfig {
    const envConfig = { ...config };

    // Services
    if (process.env.NEXUS_API_URL) {
      envConfig.services = envConfig.services || {};
      envConfig.services.apiUrl = process.env.NEXUS_API_URL;
    }
    if (process.env.NEXUS_MCP_URL) {
      envConfig.services = envConfig.services || {};
      envConfig.services.mcpUrl = process.env.NEXUS_MCP_URL;
    }

    // Auth
    if (process.env.NEXUS_API_KEY) {
      envConfig.auth = envConfig.auth || {};
      envConfig.auth.apiKey = process.env.NEXUS_API_KEY;
    }

    // Handle ${VAR} syntax in config values
    if (envConfig.auth?.apiKey && envConfig.auth.apiKey.startsWith('${') && envConfig.auth.apiKey.endsWith('}')) {
      const varName = envConfig.auth.apiKey.slice(2, -1);
      envConfig.auth.apiKey = process.env[varName] || envConfig.auth.apiKey;
    }

    return envConfig;
  }

  /**
   * Get a specific configuration value
   */
  async getValue<T = unknown>(key: string, cwd?: string): Promise<T | undefined> {
    const config = await this.getConfig(cwd);
    const parts = key.split('.');

    let current: any = config;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  /**
   * Set a configuration value in the current profile
   */
  async setValue(key: string, value: unknown): Promise<void> {
    const globalConfig = await this.loadGlobalConfig();
    const profile = await this.getCurrentProfile();

    const parts = key.split('.');
    let current: any = profile.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }

    // Update profile in global config
    const profileIndex = globalConfig.profiles.findIndex((p) => p.name === profile.name);
    if (profileIndex !== -1) {
      globalConfig.profiles[profileIndex] = profile;
      await this.saveGlobalConfig(globalConfig);
      this.mergedConfig = null; // Invalidate cache
    }
  }

  /**
   * Create workspace configuration
   */
  async initWorkspaceConfig(config: NexusConfig, cwd?: string): Promise<void> {
    const workingDir = cwd || process.cwd();
    const configPath = path.join(workingDir, this.workspaceConfigFile);

    try {
      const validated = NexusConfigSchema.parse(config);
      const content = yaml.stringify(validated);
      await fs.writeFile(configPath, content, 'utf-8');
      console.log(`Created workspace configuration at ${configPath}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid workspace configuration: ${error.errors.map((e) => e.message).join(', ')}`,
          { errors: error.errors }
        );
      }
      throw new ConfigurationError(
        `Failed to create workspace configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.mergedConfig = null;
  }

  /**
   * Load all configuration (global + workspace)
   */
  async load(): Promise<void> {
    await this.loadGlobalConfig();
    await this.loadWorkspaceConfig();
    // Merged config is created on-demand in getConfig()
  }

  /**
   * Get a configuration value by dot-notation key
   */
  get(key: string): unknown {
    const config = this.mergedConfig || DEFAULT_CONFIG;
    const parts = key.split('.');
    let current: any = config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

/**
 * Default configuration manager instance
 */
export const configManager = new ConfigManager();
