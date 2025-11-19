/**
 * Configuration Zod Schemas
 *
 * Runtime validation schemas for configuration types.
 * TypeScript types are inferred from these schemas to ensure
 * runtime validation matches compile-time types.
 */

import { z } from 'zod';

/**
 * Workspace configuration schema
 */
export const WorkspaceConfigSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['typescript', 'python', 'go', 'rust', 'java']).optional(),
});

/**
 * Services configuration schema
 */
export const ServicesConfigSchema = z.object({
  apiUrl: z.string().url().optional(),
  mcpUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().nonnegative().optional(),
});

/**
 * Authentication configuration schema
 */
export const AuthConfigSchema = z.object({
  type: z.enum(['api-key', 'bearer', 'basic', 'oauth']).optional(),
  credentials: z.union([z.string(), z.record(z.string())]).optional(),
  apiKey: z.string().optional(), // Legacy support
  strategy: z.enum(['api-key', 'oauth', 'jwt']).optional(),
  token: z.string().optional(),
});

/**
 * Defaults configuration schema
 */
export const DefaultsConfigSchema = z.object({
  outputFormat: z.enum(['text', 'json', 'yaml', 'table', 'stream-json']).optional(),
  streaming: z.boolean().optional(),
  verbose: z.boolean().optional(),
  quiet: z.boolean().optional(),
});

/**
 * Agent configuration schema
 */
export const AgentConfigSchema = z.object({
  maxIterations: z.number().positive().optional(),
  autoApproveSafe: z.boolean().optional(),
  workspace: z.string().optional(),
  budget: z.number().positive().optional(),
});

/**
 * Plugins configuration schema
 */
export const PluginsConfigSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
  autoUpdate: z.boolean().optional(),
});

/**
 * MCP configuration schema
 */
export const MCPConfigSchema = z.object({
  autoStore: z.boolean().optional(),
  memoryTags: z.array(z.string()).optional(),
  healthCheckInterval: z.number().positive().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().positive().optional(),
});

/**
 * Shortcut schema
 */
export const ShortcutSchema = z.object({
  name: z.string(),
  command: z.string(),
  description: z.string().optional(),
});

/**
 * Main Nexus configuration schema
 */
export const NexusConfigSchema = z.object({
  workspace: WorkspaceConfigSchema.optional(),
  services: ServicesConfigSchema.optional(),
  auth: AuthConfigSchema.optional(),
  defaults: DefaultsConfigSchema.optional(),
  agent: AgentConfigSchema.optional(),
  plugins: PluginsConfigSchema.optional(),
  mcp: MCPConfigSchema.optional(),
  shortcuts: z.array(ShortcutSchema).optional(),
});

/**
 * Profile schema
 */
export const ProfileSchema = z.object({
  name: z.string(),
  config: NexusConfigSchema,
  default: z.boolean().optional(),
});

/**
 * Global configuration schema
 */
export const GlobalConfigSchema = z.object({
  profiles: z.array(ProfileSchema),
  currentProfile: z.string().optional(),
  pluginDirectory: z.string().optional(),
  cacheDirectory: z.string().optional(),
  updateCheck: z.boolean().optional(),
  telemetry: z.boolean().optional(),
});

/**
 * Inferred TypeScript types from Zod schemas
 * These replace the manual interface definitions
 */
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type ServicesConfig = z.infer<typeof ServicesConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type PluginsConfig = z.infer<typeof PluginsConfigSchema>;
export type MCPConfig = z.infer<typeof MCPConfigSchema>;
export type Shortcut = z.infer<typeof ShortcutSchema>;
export type NexusConfig = z.infer<typeof NexusConfigSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
