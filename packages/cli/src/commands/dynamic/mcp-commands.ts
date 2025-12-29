/**
 * MCP Command Generator
 *
 * Dynamically generates CLI commands from MCP tools
 * Exposes all MCP tools as CLI commands
 */

import ora from 'ora';
import chalk from 'chalk';
import type { Command } from '../../types/index.js';
import type { MCPToolDefinition } from '../../types/index.js';
import { MCPClient } from '../../core/transport/mcp-client.js';
import { MCPToolMapper, createMCPToolMapper } from './mcp-tool-mapper.js';

export interface MCPCommandGeneratorConfig {
  mcpServerUrl?: string;
  autoDiscover?: boolean;
}

export class MCPCommandGenerator {
  private mcpClient: MCPClient;
  private toolMapper: MCPToolMapper;
  private commands: Command[] = [];
  private tools: MCPToolDefinition[] = [];

  constructor(_config: MCPCommandGeneratorConfig = {}) {
    this.mcpClient = new MCPClient();

    this.toolMapper = createMCPToolMapper();

    // Event listeners would require extending MCPClient to emit events
    // this.setupEventListeners();
  }

  /**
   * Discover and generate commands from MCP tools
   */
  async discover(): Promise<Command[]> {
    const spinner = ora('Discovering MCP tools...').start();

    try {
      // Check if connected (MCPClient doesn't have checkHealth)
      const isConnected = this.mcpClient.isConnected();

      if (!isConnected) {
        spinner.warn('MCP client not connected - commands will use fallback mode');
      } else {
        spinner.succeed(`MCP client connected`);
      }

      this.tools = await this.fetchMCPTools();

      spinner.text = `Generating commands from ${this.tools.length} tools...`;

      this.commands = this.generateCommands(this.tools);

      spinner.succeed(`Generated ${this.commands.length} MCP commands across ${this.toolMapper.getCategories().length} categories`);

      return this.commands;
    } catch (error) {
      spinner.fail('Failed to discover MCP tools');
      console.error(chalk.red('Error:'), error);

      return [];
    }
  }

  /**
   * Fetch MCP tools from MCP API
   */
  private async fetchMCPTools(): Promise<MCPToolDefinition[]> {
    try {
      // MCPClient uses listTools() method, not request()
      const tools = await this.mcpClient.listTools();

      // Convert MCPTool to MCPToolDefinition format
      return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        category: 'mcp',
        params: tool.inputSchema?.properties || {},
        returns: tool.outputSchema || { type: 'object' },
      })) as any;
    } catch (error) {
      return this.getDefaultTools();
    }
  }

  /**
   * Get default MCP tools (fallback when API unavailable)
   */
  private getDefaultTools(): MCPToolDefinition[] {
    return [
      {
        name: 'mcp_store_memory',
        description: 'Store memory with content and tags',
        category: 'memory',
        streaming: false,
        examples: ['nexus mcp store-memory --content "User prefers TypeScript" --tags "preferences,typescript"'],
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content' },
            tags: { type: 'array', description: 'Tags for categorization' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['content'],
        },
      },
      {
        name: 'mcp_recall_memory',
        description: 'Recall memories by query',
        category: 'memory',
        streaming: false,
        examples: ['nexus mcp recall-memory --query "typescript patterns" --limit 10'],
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Max results', default: 10 },
            score_threshold: { type: 'number', description: 'Minimum similarity score' },
          },
          required: ['query'],
        },
      },
    ];
  }

  /**
   * Generate commands from MCP tools
   */
  private generateCommands(tools: MCPToolDefinition[]): Command[] {
    const commands: Command[] = [];

    for (const tool of tools) {
      const handler = this.createCommandHandler(tool);
      const mapping = this.toolMapper.mapTool(tool, handler);
      commands.push(mapping.command);
    }

    return commands;
  }

  /**
   * Create command handler for a tool
   */
  private createCommandHandler(tool: MCPToolDefinition) {
    return async (args: any, _context: any) => {
      const spinner = ora(`Executing ${tool.name}...`).start();

      try {
        // MCPClient.executeTool() returns the result directly, not a wrapper object
        const startTime = Date.now();
        const result = await this.mcpClient.executeTool(tool.name, args);
        const duration = Date.now() - startTime;

        spinner.succeed(`Completed in ${duration}ms`);

        return {
          success: true,
          data: result,
          metadata: { duration },
        };
      } catch (error) {
        spinner.fail('Execution error');

        return {
          success: false,
          error: error as Error,
        };
      }
    };
  }

  /**
   * Get all generated commands
   */
  getCommands(): Command[] {
    return this.commands;
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): Command[] {
    const mappings = this.toolMapper.getToolsByCategory(category);
    return mappings.map((m) => m.command);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return this.toolMapper.getCategories();
  }

  /**
   * Refresh commands (re-discover tools)
   */
  async refresh(): Promise<Command[]> {
    this.toolMapper.clear();
    return this.discover();
  }

  /**
   * Start health monitoring
   * TODO: Implement health checking in MCPClient
   */
  startHealthMonitoring(): void {
    // this.mcpClient.startHealthChecks();
  }

  /**
   * Stop health monitoring
   * TODO: Implement health checking in MCPClient
   */
  stopHealthMonitoring(): void {
    // this.mcpClient.stopHealthChecks();
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    await this.mcpClient.disconnect();
  }
}

/**
 * Create MCP command generator instance
 */
export function createMCPCommandGenerator(
  config?: MCPCommandGeneratorConfig
): MCPCommandGenerator {
  return new MCPCommandGenerator(config);
}
