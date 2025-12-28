/**
 * Docker Compose Parser
 *
 * Parses docker-compose.yml files (v3.8+) to extract service metadata
 * for Nexus service discovery
 */

import { readFile } from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import type {
  DockerComposeConfig,
  DockerComposeService,
  ServiceMetadata,
  PortMapping,
  ServiceCapability
} from '@adverant-nexus/types';
import { ServiceStatus } from '@adverant-nexus/types';
import {
  loadServiceMetadata,
  getDisplayName,
  getDescription,
  hasOpenApiSpec,
  type MetadataConfig,
} from './service-metadata-loader.js';

/**
 * Docker parser configuration options
 */
export interface DockerParserOptions {
  /** Default protocol for API URLs (http or https) */
  defaultProtocol?: 'http' | 'https';
  /** Default host for API URLs */
  defaultHost?: string;
  /** Pre-loaded metadata configuration (avoids repeated file reads) */
  metadataConfig?: MetadataConfig;
}

/**
 * Parse docker-compose YAML file
 *
 * @param filePath - Path to docker-compose.yml file
 * @param options - Parser configuration options
 * @returns Parsed docker-compose configuration
 * @throws Error if file cannot be read or parsed
 */
export async function parseDockerCompose(
  filePath: string,
  _options: DockerParserOptions = {}
): Promise<DockerComposeConfig> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = yamlLoad(content) as DockerComposeConfig;

    if (!parsed.services) {
      throw new Error('Invalid docker-compose file: missing services section');
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse docker-compose file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Extract service metadata from docker-compose service definition
 *
 * @param name - Service name from docker-compose
 * @param service - Service configuration from docker-compose
 * @param options - Parser configuration options
 * @returns Extracted service metadata
 */
export async function extractServiceMetadata(
  name: string,
  service: DockerComposeService,
  options: DockerParserOptions = {}
): Promise<ServiceMetadata> {
  const {
    defaultProtocol = 'http',
    defaultHost = 'localhost',
    metadataConfig
  } = options;

  // Load metadata configuration if not provided
  const config = metadataConfig || await loadServiceMetadata();

  // Parse port mappings
  const ports = parsePortMappings(service.ports || []);

  // Determine primary port (first HTTP port)
  const primaryPort = ports.find(p => p.host > 0)?.host || 0;

  // Extract environment variables
  const environment = parseEnvironment(service.environment || {});

  // Generate API URL
  const apiUrl = primaryPort > 0
    ? `${defaultProtocol}://${defaultHost}:${primaryPort}`
    : '';

  // Detect WebSocket support
  const wsPort = detectWebSocketPort(service, ports);
  const wsUrl = wsPort > 0
    ? `ws://${defaultHost}:${wsPort}`
    : undefined;

  // Extract dependencies
  const dependencies = extractDependencies(service.depends_on);

  // Detect service capabilities
  const capabilities = detectCapabilities(name, service, environment);

  // Get display name from config (replaces generateDisplayName)
  const displayName = getDisplayName(name, config);

  // Get description from config (replaces generateDescription)
  const description = getDescription(name, config);

  // Determine health endpoint
  const healthEndpoint = detectHealthEndpoint(service, primaryPort);

  // Check if service has OpenAPI from config (replaces detectOpenApiSpec)
  const openApiSpec = hasOpenApiSpec(name, config) && primaryPort > 0
    ? '/openapi.json'
    : undefined;
  const graphqlSchema = detectGraphQLSchema(name, environment);

  return {
    name: name.replace(/^nexus-/, ''), // Remove nexus- prefix for cleaner names
    displayName,
    description,
    version: service.image?.split(':')[1] || 'latest',
    status: ServiceStatus.UNKNOWN,
    container: service.container_name || name,
    ports,
    ...(healthEndpoint !== undefined && { healthEndpoint }),
    apiUrl,
    ...(wsUrl !== undefined && { wsUrl }),
    ...(openApiSpec !== undefined && { openApiSpec }),
    ...(graphqlSchema !== undefined && { graphqlSchema }),
    capabilities,
    dependencies,
    environment
  };
}

/**
 * Parse port mappings from docker-compose format
 *
 * @param ports - Port strings from docker-compose
 * @returns Parsed port mappings
 */
function parsePortMappings(ports: string[]): PortMapping[] {
  return ports.map(portStr => {
    // Format: "host:container" or "host:container/protocol"
    const [mapping, protocol = 'tcp'] = portStr.split('/');
    const [hostStr, containerStr] = (mapping || '').split(':');

    return {
      host: parseInt(hostStr || '0', 10),
      container: containerStr ? parseInt(containerStr, 10) : parseInt(hostStr || '0', 10),
      protocol: protocol as 'tcp' | 'udp'
    };
  });
}

/**
 * Parse environment variables (array or object format)
 *
 * @param env - Environment variables from docker-compose
 * @returns Normalized environment variables object
 */
function parseEnvironment(env: Record<string, string> | string[]): Record<string, string> {
  if (Array.isArray(env)) {
    const result: Record<string, string> = {};
    for (const item of env) {
      const [key, ...valueParts] = item.split('=');
      if (key) {
        result[key] = valueParts.join('=') || '';
      }
    }
    return result;
  }
  return env;
}

/**
 * Extract service dependencies
 *
 * @param depends_on - Dependencies from docker-compose
 * @returns Array of dependency service names
 */
function extractDependencies(depends_on?: string[] | Record<string, any>): string[] {
  if (!depends_on) return [];

  if (Array.isArray(depends_on)) {
    return depends_on.map(dep => dep.replace(/^nexus-/, ''));
  }

  return Object.keys(depends_on).map(dep => dep.replace(/^nexus-/, ''));
}

/**
 * Detect WebSocket port from service configuration
 *
 * @param service - Service configuration
 * @param ports - Parsed port mappings
 * @returns WebSocket port number or 0 if not found
 */
function detectWebSocketPort(
  service: DockerComposeService,
  ports: PortMapping[]
): number {
  // Check environment variables for WS_PORT
  const env = parseEnvironment(service.environment || {});
  const wsPortEnv = env.WS_PORT || env.WEBSOCKET_PORT;

  if (wsPortEnv) {
    // Find the host port that maps to this container port
    const containerPort = parseInt(wsPortEnv, 10);
    const mapping = ports.find(p => p.container === containerPort);
    return mapping?.host || 0;
  }

  // Check if service name suggests WebSocket support
  const serviceName = service.container_name || '';
  if (serviceName.includes('gateway') || serviceName.includes('api')) {
    // Second port is often WebSocket
    return ports[1]?.host || 0;
  }

  return 0;
}

/**
 * Detect service capabilities based on name and configuration
 *
 * @param name - Service name
 * @param service - Service configuration
 * @param env - Parsed environment variables
 * @returns Array of detected capabilities
 */
function detectCapabilities(
  name: string,
  service: DockerComposeService,
  env: Record<string, string>
): ServiceCapability[] {
  const capabilities: ServiceCapability[] = [];
  const ports = parsePortMappings(service.ports || []);
  const primaryPort = ports[0]?.host || 0;

  // REST API capability (most services have this)
  if (primaryPort > 0) {
    capabilities.push({
      name: 'REST API',
      type: 'rest',
      endpoint: `/api`,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    });
  }

  // WebSocket capability
  const wsPort = detectWebSocketPort(service, ports);
  if (wsPort > 0) {
    capabilities.push({
      name: 'WebSocket',
      type: 'websocket',
      endpoint: `/`,
      methods: []
    });
  }

  // GraphQL capability
  if (env.GRAPHQL_ENABLED === 'true' || name.includes('graphql')) {
    capabilities.push({
      name: 'GraphQL',
      type: 'graphql',
      endpoint: `/graphql`,
      methods: ['POST']
    });
  }

  // MCP capability
  if (name.includes('mcp') || env.MCP_MODE === 'true') {
    capabilities.push({
      name: 'MCP Server',
      type: 'mcp',
      endpoint: `/`,
      methods: []
    });
  }

  return capabilities;
}

/**
 * Detect health endpoint
 *
 * @param service - Service configuration
 * @param port - Primary port number
 * @returns Health endpoint path or undefined
 */
function detectHealthEndpoint(service: DockerComposeService, port: number): string | undefined {
  const healthcheck = service.healthcheck;

  if (!healthcheck) {
    // Default health endpoints
    if (port > 0) {
      return '/health';
    }
    return undefined;
  }

  // Parse health check command to extract endpoint
  const test = Array.isArray(healthcheck.test)
    ? healthcheck.test.join(' ')
    : healthcheck.test;

  // Extract endpoint from wget/curl commands
  const curlMatch = test.match(/curl.*?(https?:\/\/[^\s]+)/);
  const wgetMatch = test.match(/wget.*?(https?:\/\/[^\s]+)/);

  if (curlMatch || wgetMatch) {
    const url = curlMatch?.[1] || wgetMatch?.[1];
    if (url) {
      // Extract path from URL
      try {
        const urlObj = new URL(url);
        return urlObj.pathname;
      } catch {
        return '/health';
      }
    }
  }

  return '/health';
}

/**
 * Detect GraphQL schema endpoint
 *
 * @param name - Service name
 * @param env - Parsed environment variables
 * @returns GraphQL endpoint path or undefined
 */
function detectGraphQLSchema(name: string, env: Record<string, string>): string | undefined {
  if (env.GRAPHQL_ENABLED !== 'true' && !name.includes('graphql')) {
    return undefined;
  }

  return '/graphql';
}

/**
 * Parse multiple docker-compose files and merge services
 *
 * @param filePaths - Array of docker-compose file paths
 * @param options - Parser configuration options
 * @returns Map of all discovered services
 */
export async function parseMultipleComposeFiles(
  filePaths: string[],
  options: DockerParserOptions = {}
): Promise<Map<string, ServiceMetadata>> {
  const services = new Map<string, ServiceMetadata>();

  // Load metadata config once for all services
  const metadataConfig = options.metadataConfig || await loadServiceMetadata();
  const optionsWithConfig = { ...options, metadataConfig };

  for (const filePath of filePaths) {
    try {
      const config = await parseDockerCompose(filePath, options);

      for (const [name, service] of Object.entries(config.services)) {
        const metadata = await extractServiceMetadata(name, service, optionsWithConfig);
        services.set(metadata.name, metadata);
      }
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}:`, error);
      // Continue with other files
    }
  }

  return services;
}

/**
 * Filter services by type (exclude databases, infrastructure)
 *
 * @param services - Map of all services
 * @param config - Optional metadata configuration (loads from file if not provided)
 * @returns Map of application services only
 */
export async function filterApplicationServices(
  services: Map<string, ServiceMetadata>,
  config?: MetadataConfig
): Promise<Map<string, ServiceMetadata>> {
  // Load config if not provided
  const metadataConfig = config || await loadServiceMetadata();

  // Get infrastructure services from config
  const infraServices = await import('./service-metadata-loader.js').then(
    module => module.getInfrastructureServices(metadataConfig)
  );

  const filtered = new Map<string, ServiceMetadata>();

  for (const [name, service] of services) {
    const cleanName = name.toLowerCase().replace(/^nexus-/, '');
    if (!infraServices.has(cleanName)) {
      filtered.set(name, service);
    }
  }

  return filtered;
}
