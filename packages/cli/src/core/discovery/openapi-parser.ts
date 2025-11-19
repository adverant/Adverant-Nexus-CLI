/**
 * OpenAPI Parser
 *
 * Fetches and parses OpenAPI 3.x schemas from service endpoints
 * Generates command definitions from API operations
 */

import axios from 'axios';
import { load as yamlLoad } from 'js-yaml';
import type { ServiceCommand, CommandParameter } from '@nexus-cli/types';

/**
 * OpenAPI 3.x Specification
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

/**
 * OpenAPI path item with HTTP methods
 */
export interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
}

/**
 * OpenAPI operation definition
 */
export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content: Record<string, {
      schema: any;
    }>;
  };
  responses: Record<string, any>;
  'x-streaming'?: boolean;
}

/**
 * OpenAPI parameter definition
 */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: {
    type: string;
    format?: string;
    enum?: any[];
    default?: any;
  };
}

/**
 * OpenAPI parser configuration options
 */
export interface OpenAPIParserOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional HTTP headers */
  headers?: Record<string, string>;
  /** Resolve $ref references */
  resolveRefs?: boolean;
}

/**
 * Fetch OpenAPI spec from service endpoint
 *
 * Tries multiple common OpenAPI spec endpoints
 *
 * @param url - Base URL or direct spec URL
 * @param options - Parser configuration options
 * @returns Parsed OpenAPI spec or null if not found
 */
export async function fetchOpenAPISpec(
  url: string,
  options: OpenAPIParserOptions = {}
): Promise<OpenAPISpec | null> {
  const { timeout = 5000, headers = {} } = options;

  // Try common OpenAPI spec endpoints
  const endpoints = [
    url,
    `${url}/openapi.json`,
    `${url}/api-docs`,
    `${url}/swagger.json`,
    `${url}/v3/api-docs`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout,
        headers: {
          'Accept': 'application/json, application/yaml',
          ...headers
        },
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses
      });

      if (response.status === 200) {
        // Parse JSON or YAML
        let spec: OpenAPISpec;

        if (typeof response.data === 'string') {
          // Try parsing as YAML first, then JSON
          try {
            spec = yamlLoad(response.data) as OpenAPISpec;
          } catch {
            spec = JSON.parse(response.data);
          }
        } else {
          spec = response.data;
        }

        // Validate it's an OpenAPI spec
        if (spec.openapi && spec.paths) {
          return spec;
        }
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  return null;
}

/**
 * Parse OpenAPI spec and generate command definitions
 *
 * @param spec - OpenAPI specification
 * @param namespace - Command namespace (service name)
 * @returns Array of generated commands
 */
export async function parseOpenAPIToCommands(
  spec: OpenAPISpec,
  namespace: string
): Promise<ServiceCommand[]> {
  const commands: ServiceCommand[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isHttpMethod(method)) continue;

      const command = generateCommandFromOperation(
        path,
        method.toUpperCase() as any,
        operation,
        namespace
      );

      if (command) {
        commands.push(command);
      }
    }
  }

  return commands;
}

/**
 * Generate a command definition from an OpenAPI operation
 *
 * @param path - API path
 * @param method - HTTP method
 * @param operation - OpenAPI operation
 * @param namespace - Command namespace
 * @returns Generated command or null if skipped
 */
function generateCommandFromOperation(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  operation: OpenAPIOperation,
  namespace: string
): ServiceCommand | null {
  // Skip health/internal endpoints
  if (path.includes('/health') || path.includes('/internal')) {
    return null;
  }

  // Generate command name from path and operation
  const commandName = generateCommandName(path, method, operation);

  // Extract parameters
  const params = extractParameters(operation);

  // Determine if operation supports streaming
  const streaming = operation['x-streaming'] === true ||
    operation.description?.toLowerCase().includes('stream') ||
    false;

  // Generate examples
  const examples = generateExamples(namespace, commandName, params);

  return {
    name: commandName,
    namespace,
    description: operation.summary || operation.description || `${method} ${path}`,
    endpoint: path,
    method,
    params,
    streaming,
    examples
  };
}

/**
 * Generate command name from path and operation
 *
 * @param path - API path
 * @param method - HTTP method
 * @param operation - OpenAPI operation
 * @returns Generated command name in kebab-case
 */
function generateCommandName(
  path: string,
  method: string,
  operation: OpenAPIOperation
): string {
  // Use operationId if available
  if (operation.operationId) {
    return kebabCase(operation.operationId);
  }

  // Generate from path and method
  // Example: POST /documents → create-document
  // Example: GET /documents/{id} → get-document
  // Example: DELETE /documents/{id} → delete-document

  const pathParts = path
    .split('/')
    .filter(p => p && !p.startsWith('{'))
    .map(p => p.replace(/[^a-zA-Z0-9]/g, ''));

  const action = getActionFromMethod(method);
  const resource = pathParts[pathParts.length - 1] || 'item';

  return `${action}-${resource}`;
}

/**
 * Get action verb from HTTP method
 *
 * @param method - HTTP method
 * @returns Action verb
 */
function getActionFromMethod(method: string): string {
  const actions: Record<string, string> = {
    'GET': 'get',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };

  return actions[method.toUpperCase()] || 'execute';
}

/**
 * Extract parameters from OpenAPI operation
 *
 * @param operation - OpenAPI operation
 * @returns Array of command parameters
 */
function extractParameters(operation: OpenAPIOperation): CommandParameter[] {
  const params: CommandParameter[] = [];

  // Extract from parameters array
  if (operation.parameters) {
    for (const param of operation.parameters) {
      params.push({
        name: param.name,
        type: mapOpenAPIType(param.schema.type),
        required: param.required || false,
        description: param.description || '',
        ...(param.schema.default !== undefined && { default: param.schema.default }),
        ...(param.schema.enum !== undefined && { enum: param.schema.enum }),
        ...(param.schema.format !== undefined && { format: param.schema.format })
      });
    }
  }

  // Extract from request body
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    const jsonContent = content['application/json'];

    if (jsonContent?.schema) {
      const bodyParams = extractSchemaParameters(
        jsonContent.schema,
        operation.requestBody.required || false
      );
      params.push(...bodyParams);
    }
  }

  return params;
}

/**
 * Extract parameters from JSON schema
 *
 * @param schema - JSON schema
 * @param required - Whether the schema is required
 * @returns Array of command parameters
 */
function extractSchemaParameters(
  schema: any,
  required: boolean = false
): CommandParameter[] {
  const params: CommandParameter[] = [];

  if (schema.type === 'object' && schema.properties) {
    const requiredProps = new Set(schema.required || []);

    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;

      params.push({
        name,
        type: mapOpenAPIType(prop.type),
        required: requiredProps.has(name),
        description: prop.description || '',
        default: prop.default,
        enum: prop.enum,
        format: prop.format
      });
    }
  } else if (schema.$ref) {
    // TODO: Resolve $ref if needed
    params.push({
      name: 'body',
      type: 'object',
      required,
      description: 'Request body',
      format: 'json'
    });
  } else {
    // Simple type
    params.push({
      name: 'body',
      type: mapOpenAPIType(schema.type),
      required,
      description: schema.description || 'Request body'
    });
  }

  return params;
}

/**
 * Map OpenAPI type to CLI parameter type
 *
 * @param type - OpenAPI type
 * @returns CLI parameter type
 */
function mapOpenAPIType(type: string): CommandParameter['type'] {
  const typeMap: Record<string, CommandParameter['type']> = {
    'string': 'string',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'array': 'array',
    'object': 'object',
    'file': 'file'
  };

  return typeMap[type] || 'string';
}

/**
 * Generate usage examples for command
 *
 * @param namespace - Command namespace
 * @param commandName - Command name
 * @param params - Command parameters
 * @returns Array of example usage strings
 */
function generateExamples(
  namespace: string,
  commandName: string,
  params: CommandParameter[]
): string[] {
  const examples: string[] = [];

  // Basic example
  const requiredParams = params.filter(p => p.required);
  if (requiredParams.length > 0) {
    const paramStr = requiredParams
      .map(p => {
        if (p.type === 'boolean') {
          return `--${p.name}`;
        } else if (p.type === 'file') {
          return `--${p.name} /path/to/file`;
        } else if (p.enum && p.enum.length > 0) {
          return `--${p.name} ${p.enum[0]}`;
        } else {
          return `--${p.name} <value>`;
        }
      })
      .join(' ');

    examples.push(`nexus ${namespace} ${commandName} ${paramStr}`);
  } else {
    examples.push(`nexus ${namespace} ${commandName}`);
  }

  // Example with optional params
  const optionalParams = params.filter(p => !p.required);
  if (optionalParams.length > 0 && optionalParams.length <= 2) {
    const allParams = [...requiredParams, ...optionalParams.slice(0, 2)]
      .map(p => {
        if (p.type === 'boolean') {
          return `--${p.name}`;
        } else if (p.default !== undefined) {
          return `--${p.name} ${p.default}`;
        } else {
          return `--${p.name} <value>`;
        }
      })
      .join(' ');

    examples.push(`nexus ${namespace} ${commandName} ${allParams}`);
  }

  // JSON output example
  if (examples.length > 0) {
    examples.push(`${examples[0]} --output-format json`);
  }

  return examples.slice(0, 3); // Max 3 examples
}

/**
 * Check if string is a valid HTTP method
 *
 * @param method - Method string to check
 * @returns True if valid HTTP method
 */
function isHttpMethod(method: string): boolean {
  return ['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase());
}

/**
 * Convert string to kebab-case
 *
 * @param str - String to convert
 * @returns kebab-case string
 */
function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Resolve $ref references in OpenAPI spec
 *
 * @param spec - OpenAPI specification
 * @param ref - Reference string (e.g., "#/components/schemas/User")
 * @returns Resolved schema or null if not found
 */
export function resolveRefs(spec: OpenAPISpec, ref: string): any {
  // Example ref: "#/components/schemas/User"
  const parts = ref.replace('#/', '').split('/');

  let current: any = spec;
  for (const part of parts) {
    current = current[part];
    if (!current) return null;
  }

  return current;
}

/**
 * Get all operations from OpenAPI spec
 *
 * @param spec - OpenAPI specification
 * @returns Array of all operations with their paths and methods
 */
export function getAllOperations(spec: OpenAPISpec): Array<{
  path: string;
  method: string;
  operation: OpenAPIOperation;
}> {
  const operations: Array<{
    path: string;
    method: string;
    operation: OpenAPIOperation;
  }> = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (isHttpMethod(method)) {
        operations.push({
          path,
          method: method.toUpperCase(),
          operation: operation as OpenAPIOperation
        });
      }
    }
  }

  return operations;
}

/**
 * Get authentication requirements from OpenAPI spec
 *
 * @param spec - OpenAPI specification
 * @returns Authentication type and configuration
 */
export function getAuthRequirements(spec: OpenAPISpec): {
  type: 'apiKey' | 'bearer' | 'oauth2' | 'none';
  location?: string;
  name?: string;
} {
  const securitySchemes = spec.components?.securitySchemes;

  if (!securitySchemes) {
    return { type: 'none' };
  }

  // Get first security scheme
  const [schemeName, scheme] = Object.entries(securitySchemes)[0] || [];

  if (!scheme) {
    return { type: 'none' };
  }

  if (scheme.type === 'apiKey') {
    return {
      type: 'apiKey',
      location: scheme.in,
      name: scheme.name
    };
  }

  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { type: 'bearer' };
  }

  if (scheme.type === 'oauth2') {
    return { type: 'oauth2' };
  }

  return { type: 'none' };
}
