/**
 * MCP Tool Mapper
 *
 * Maps MCP tool definitions to CLI commands
 * Parses tool schemas and generates command structures
 */

import type { Command, ArgumentDefinition, OptionDefinition } from '@adverant-nexus/types';
import type { MCPToolDefinition, MCPToolCategory } from '@adverant-nexus/types';

export interface MCPToolMapping {
  tool: MCPToolDefinition;
  command: Command;
  cliName: string;
  category: MCPToolCategory;
}

export interface MCPToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  properties?: Record<string, MCPToolParameter>;
  items?: MCPToolParameter;
}

export class MCPToolMapper {
  private toolMappings: Map<string, MCPToolMapping> = new Map();
  private categoryMap: Map<MCPToolCategory, string[]> = new Map();

  /**
   * Map MCP tool to CLI command
   */
  mapTool(tool: MCPToolDefinition, handler: any): MCPToolMapping {
    const cliName = this.convertToCliName(tool.name);
    const category = tool.category;

    const command: Command = {
      name: cliName,
      namespace: 'mcp',
      description: tool.description || `Execute ${tool.name}`,
      handler,
      category: category as string,
      streaming: tool.streaming,
    };

    const { args, options } = this.parseInputSchema(tool.inputSchema);
    command.args = args;
    command.options = options;

    command.examples = tool.examples || this.generateExamples(cliName, tool);
    command.usage = this.generateUsage(cliName, args, options);

    const mapping: MCPToolMapping = {
      tool,
      command,
      cliName,
      category,
    };

    this.toolMappings.set(tool.name, mapping);
    this.addToCategory(category, tool.name);

    return mapping;
  }

  /**
   * Map multiple tools at once
   */
  mapTools(tools: MCPToolDefinition[], handler: any): MCPToolMapping[] {
    return tools.map((tool) => this.mapTool(tool, handler));
  }

  /**
   * Convert MCP tool name to CLI-friendly name
   * Examples:
   *   mcp_store_memory -> store-memory
   *   mcp_recall_episodes -> recall-episodes
   */
  private convertToCliName(toolName: string): string {
    let name = toolName
      .replace(/^mcp__MCP_DOCKER__/, '')
      .replace(/^mcp_/, '')
      .replace(/^brain_/, '');

    name = name.replace(/_/g, '-');

    return name;
  }

  /**
   * Parse JSON Schema input schema to CLI arguments and options
   */
  private parseInputSchema(schema: any): {
    args: ArgumentDefinition[];
    options: OptionDefinition[];
  } {
    if (!schema || !schema.properties) {
      return { args: [], options: [] };
    }

    const args: ArgumentDefinition[] = [];
    const options: OptionDefinition[] = [];
    const required = schema.required || [];

    for (const [name, prop] of Object.entries(schema.properties)) {
      const param = prop as MCPToolParameter;
      const isRequired = required.includes(name);

      const option: OptionDefinition = {
        long: `--${name.replace(/_/g, '-')}`,
        description: param.description || name,
        required: isRequired,
        type: this.mapJsonTypeToCliType(param.type, param),
      };

      if (name.length === 1 || ['query', 'file', 'path', 'id'].includes(name)) {
        option.short = `-${name[0]}`;
      }

      if (param.default !== undefined) {
        option.default = param.default;
      }

      if (param.enum && param.enum.length > 0) {
        option.choices = param.enum;
      }

      options.push(option);
    }

    return { args, options };
  }

  /**
   * Map JSON Schema type to CLI argument type
   */
  private mapJsonTypeToCliType(
    jsonType: string,
    param: MCPToolParameter
  ): 'string' | 'number' | 'boolean' | 'array' | 'file' | 'directory' | 'url' | 'json' {
    switch (jsonType) {
      case 'string':
        if (param.description?.toLowerCase().includes('file')) return 'file';
        if (param.description?.toLowerCase().includes('directory')) return 'directory';
        if (param.description?.toLowerCase().includes('url')) return 'url';
        return 'string';

      case 'number':
      case 'integer':
        return 'number';

      case 'boolean':
        return 'boolean';

      case 'array':
        return 'array';

      case 'object':
        return 'json';

      default:
        return 'string';
    }
  }

  /**
   * Generate usage string for command
   */
  private generateUsage(
    cliName: string,
    _args: ArgumentDefinition[],
    options: OptionDefinition[]
  ): string {
    let usage = `nexus mcp ${cliName}`;

    const requiredOptions = options.filter((opt) => opt.required);
    for (const opt of requiredOptions) {
      usage += ` ${opt.long} <value>`;
    }

    if (options.some((opt) => !opt.required)) {
      usage += ' [options]';
    }

    return usage;
  }

  /**
   * Generate example commands
   */
  private generateExamples(cliName: string, tool: MCPToolDefinition): string[] {
    const examples: string[] = [];

    switch (tool.category) {
      case 'memory':
        if (cliName.includes('store')) {
          examples.push(
            `nexus mcp ${cliName} --content "User prefers TypeScript" --tags "preferences,typescript"`
          );
        } else if (cliName.includes('recall')) {
          examples.push(
            `nexus mcp ${cliName} --query "typescript patterns" --limit 10`
          );
        }
        break;

      case 'documents':
        if (cliName.includes('store')) {
          examples.push(
            `nexus mcp ${cliName} --file report.pdf --title "Q4 Report"`
          );
        } else if (cliName.includes('retrieve')) {
          examples.push(
            `nexus mcp ${cliName} --query "authentication" --strategy semantic_chunks`
          );
        }
        break;

      case 'knowledge-graph':
        if (cliName.includes('store-entity')) {
          examples.push(
            `nexus mcp ${cliName} --domain code --type class --content "User class"`
          );
        } else if (cliName.includes('query')) {
          examples.push(
            `nexus mcp ${cliName} --domain code --search "authentication"`
          );
        }
        break;

      case 'code-analysis':
        if (cliName.includes('validate-code')) {
          examples.push(
            `nexus mcp ${cliName} --file app.ts --risk-level high`
          );
        } else if (cliName.includes('analyze')) {
          examples.push(
            `nexus mcp ${cliName} --file app.ts --depth deep --focus security,performance`
          );
        }
        break;

      case 'multi-agent':
        if (cliName.includes('orchestrate')) {
          examples.push(
            `nexus mcp ${cliName} --task "Analyze codebase for security issues" --max-agents 5`
          );
        }
        break;

      case 'learning':
        if (cliName.includes('trigger')) {
          examples.push(
            `nexus mcp ${cliName} --topic "rust_async" --priority 9`
          );
        } else if (cliName.includes('recall')) {
          examples.push(
            `nexus mcp ${cliName} --topic "typescript_patterns" --layer EXPERT`
          );
        }
        break;

      case 'episodes':
        if (cliName.includes('store')) {
          examples.push(
            `nexus mcp ${cliName} --content "Fixed memory leak" --type insight`
          );
        } else if (cliName.includes('recall')) {
          examples.push(
            `nexus mcp ${cliName} --query "refactoring sessions" --limit 10`
          );
        }
        break;

      case 'health':
        if (cliName.includes('health')) {
          examples.push(`nexus mcp ${cliName} --detailed`);
        }
        break;
    }

    if (examples.length === 0) {
      examples.push(`nexus mcp ${cliName} [options]`);
    }

    return examples;
  }

  /**
   * Add tool to category
   */
  private addToCategory(category: MCPToolCategory, toolName: string): void {
    if (!this.categoryMap.has(category)) {
      this.categoryMap.set(category, []);
    }
    this.categoryMap.get(category)!.push(toolName);
  }

  /**
   * Get all tools in a category
   */
  getToolsByCategory(category: string): MCPToolMapping[] {
    const toolNames = this.categoryMap.get(category as MCPToolCategory) || [];
    return toolNames
      .map((name) => this.toolMappings.get(name))
      .filter((mapping): mapping is MCPToolMapping => mapping !== undefined);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categoryMap.keys());
  }

  /**
   * Get tool mapping by name
   */
  getMapping(toolName: string): MCPToolMapping | undefined {
    return this.toolMappings.get(toolName);
  }

  /**
   * Get all tool mappings
   */
  getAllMappings(): MCPToolMapping[] {
    return Array.from(this.toolMappings.values());
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.toolMappings.clear();
    this.categoryMap.clear();
  }
}

/**
 * Create a default MCP tool mapper instance
 */
export function createMCPToolMapper(): MCPToolMapper {
  return new MCPToolMapper();
}
