/**
 * Service Metadata Loader
 *
 * Loads service metadata from external configuration files
 * Replaces hardcoded service information with configurable data
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service metadata from configuration file
 */
export interface ServiceMetadataConfig {
  displayName: string;
  description: string;
  hasOpenApi?: boolean;
  infrastructure?: boolean;
  aliases?: string[];
}

/**
 * Full metadata configuration structure
 */
export interface MetadataConfig {
  version: string;
  services: Record<string, ServiceMetadataConfig>;
  defaultMetadata?: {
    displayNameFormat?: 'capitalize-words' | 'uppercase' | 'as-is';
    descriptionTemplate?: string;
    hasOpenApi?: boolean;
    infrastructure?: boolean;
  };
}

/**
 * Cached metadata to avoid repeated file reads
 */
let cachedMetadata: MetadataConfig | null = null;

/**
 * Load service metadata configuration from file
 *
 * @param configPath - Optional custom config path
 * @returns Parsed metadata configuration
 */
export async function loadServiceMetadata(
  configPath?: string
): Promise<MetadataConfig> {
  // Return cached metadata if available
  if (cachedMetadata) {
    return cachedMetadata;
  }

  // Default config location: ../../../../config/service-metadata.json
  const defaultPath = path.resolve(
    __dirname,
    '../../../../config/service-metadata.json'
  );

  const filePath = configPath || defaultPath;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content) as MetadataConfig;

    // Cache the loaded metadata
    cachedMetadata = config;

    return config;
  } catch (error) {
    console.warn(
      `Warning: Could not load service metadata from ${filePath}:`,
      error instanceof Error ? error.message : String(error)
    );

    // Return empty fallback configuration
    return {
      version: '1.0.0',
      services: {},
      defaultMetadata: {
        displayNameFormat: 'capitalize-words',
        descriptionTemplate: '{displayName} service',
        hasOpenApi: false,
        infrastructure: false,
      },
    };
  }
}

/**
 * Get metadata for a specific service
 *
 * @param serviceName - Service name (without nexus- prefix)
 * @param config - Loaded metadata configuration
 * @returns Service metadata or undefined
 */
export function getServiceMetadata(
  serviceName: string,
  config: MetadataConfig
): ServiceMetadataConfig | undefined {
  // Clean service name (remove nexus- prefix if present)
  const cleanName = serviceName.replace(/^nexus-/, '');

  return config.services[cleanName];
}

/**
 * Get display name for a service
 *
 * @param serviceName - Service name
 * @param config - Loaded metadata configuration
 * @returns Display name (formatted or from config)
 */
export function getDisplayName(
  serviceName: string,
  config: MetadataConfig
): string {
  const cleanName = serviceName.replace(/^nexus-/, '');
  const metadata = config.services[cleanName];

  if (metadata?.displayName) {
    return metadata.displayName;
  }

  // Apply default formatting
  const format = config.defaultMetadata?.displayNameFormat || 'capitalize-words';

  switch (format) {
    case 'uppercase':
      return cleanName.toUpperCase();
    case 'as-is':
      return cleanName;
    case 'capitalize-words':
    default:
      return cleanName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

/**
 * Get description for a service
 *
 * @param serviceName - Service name
 * @param config - Loaded metadata configuration
 * @returns Service description
 */
export function getDescription(
  serviceName: string,
  config: MetadataConfig
): string {
  const cleanName = serviceName.replace(/^nexus-/, '');
  const metadata = config.services[cleanName];

  if (metadata?.description) {
    return metadata.description;
  }

  // Use default template
  const displayName = getDisplayName(serviceName, config);
  const template =
    config.defaultMetadata?.descriptionTemplate || '{displayName} service';

  return template.replace('{displayName}', displayName);
}

/**
 * Check if service has OpenAPI spec
 *
 * @param serviceName - Service name
 * @param config - Loaded metadata configuration
 * @returns true if service has OpenAPI spec
 */
export function hasOpenApiSpec(
  serviceName: string,
  config: MetadataConfig
): boolean {
  const cleanName = serviceName.replace(/^nexus-/, '');
  const metadata = config.services[cleanName];

  if (metadata?.hasOpenApi !== undefined) {
    return metadata.hasOpenApi;
  }

  return config.defaultMetadata?.hasOpenApi || false;
}

/**
 * Check if service is infrastructure service
 *
 * @param serviceName - Service name
 * @param config - Loaded metadata configuration
 * @returns true if service is infrastructure
 */
export function isInfrastructure(
  serviceName: string,
  config: MetadataConfig
): boolean {
  const cleanName = serviceName.replace(/^nexus-/, '');
  const metadata = config.services[cleanName];

  if (metadata?.infrastructure !== undefined) {
    return metadata.infrastructure;
  }

  return config.defaultMetadata?.infrastructure || false;
}

/**
 * Clear cached metadata (useful for testing)
 */
export function clearMetadataCache(): void {
  cachedMetadata = null;
}

/**
 * Get all infrastructure service names
 *
 * @param config - Loaded metadata configuration
 * @returns Set of infrastructure service names
 */
export function getInfrastructureServices(
  config: MetadataConfig
): Set<string> {
  const infraServices = new Set<string>();

  for (const [name, metadata] of Object.entries(config.services)) {
    if (metadata.infrastructure) {
      infraServices.add(name);
    }
  }

  return infraServices;
}
