/**
 * Command Registry
 *
 * Central registry for all CLI commands with support for:
 * - Static command registration
 * - Dynamic command discovery from services
 * - MCP tool integration
 * - Plugin command registration
 * - Command validation and lookup
 */

import type {
  Command,
  CommandRegistry as ICommandRegistry,
  DynamicCommandSource,
} from '@adverant/nexus-cli-types';

/**
 * Command Registry Implementation
 *
 * Manages all registered commands with support for:
 * - Namespace-based organization (e.g., services:health, graphrag:query)
 * - Dynamic command sources (discovered services, MCP tools)
 * - Command aliases and search
 * - Validation before execution
 */
export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliasIndex: Map<string, string> = new Map(); // alias -> commandKey (O(1) lookup)
  private dynamicSources: Map<string, DynamicCommandSource> = new Map();

  /**
   * Register a single command
   * Now builds alias index for O(1) lookup performance
   *
   * @param command - Command definition with handler, metadata, etc.
   */
  register(command: Command): void {
    const key = this.getCommandKey(command.name, command.namespace);

    if (this.commands.has(key)) {
      console.warn(`Command ${key} is already registered, overwriting`);
      // Remove old aliases if overwriting
      this._removeAliasesForKey(key);
    }

    this.commands.set(key, command);

    // Build alias index for O(1) lookup
    if (command.aliases && Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        this.aliasIndex.set(alias, key);
      }
    }
  }

  /**
   * Register multiple commands at once
   *
   * @param commands - Array of command definitions
   */
  registerMany(commands: Command[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Unregister a command
   * Now also removes aliases from index
   *
   * @param name - Command name
   * @param namespace - Optional namespace
   */
  unregister(name: string, namespace?: string): void {
    const key = this.getCommandKey(name, namespace);

    // Remove aliases before removing command
    this._removeAliasesForKey(key);

    this.commands.delete(key);
  }

  /**
   * Get a command by name and optional namespace
   *
   * @param name - Command name
   * @param namespace - Optional namespace
   * @returns Command definition or undefined
   */
  get(name: string, namespace?: string): Command | undefined {
    const key = this.getCommandKey(name, namespace);
    return this.commands.get(key);
  }

  /**
   * Check if a command exists
   *
   * @param name - Command name
   * @param namespace - Optional namespace
   * @returns true if command is registered
   */
  has(name: string, namespace?: string): boolean {
    const key = this.getCommandKey(name, namespace);
    return this.commands.has(key);
  }

  /**
   * List all commands, optionally filtered by namespace
   *
   * @param namespace - Optional namespace filter
   * @returns Array of commands
   */
  list(namespace?: string): Command[] {
    const commands = Array.from(this.commands.values());

    if (namespace) {
      return commands.filter((cmd) => cmd.namespace === namespace);
    }

    return commands;
  }

  /**
   * List all registered namespaces
   *
   * @returns Array of unique namespace strings
   */
  listNamespaces(): string[] {
    const namespaces = new Set<string>();

    for (const command of this.commands.values()) {
      if (command.namespace) {
        namespaces.add(command.namespace);
      }
    }

    return Array.from(namespaces).sort();
  }

  /**
   * Register a dynamic command source
   *
   * Dynamic sources can discover commands at runtime from:
   * - Discovered Nexus services
   * - MCP tools
   * - Plugins
   *
   * @param source - Dynamic command source implementation
   */
  registerDynamicSource(source: DynamicCommandSource): void {
    this.dynamicSources.set(source.namespace, source);
  }

  /**
   * Unregister a dynamic command source
   *
   * @param namespace - Source namespace
   */
  unregisterDynamicSource(namespace: string): void {
    this.dynamicSources.delete(namespace);
  }

  /**
   * Discover and register commands from all dynamic sources
   *
   * This method:
   * 1. Calls discover() on each registered dynamic source
   * 2. Registers discovered commands
   * 3. Handles errors gracefully per source
   *
   * @returns Promise that resolves when all sources have been processed
   */
  async discoverDynamicCommands(): Promise<void> {
    const discoveryPromises = Array.from(this.dynamicSources.values()).map(
      async (source) => {
        try {
          const commands = await source.discover();
          this.registerMany(commands);
        } catch (error) {
          console.error(
            `Failed to discover commands from ${source.namespace}:`,
            error
          );
        }
      }
    );

    await Promise.all(discoveryPromises);
  }

  /**
   * Refresh commands from all dynamic sources
   *
   * This method:
   * 1. Calls refresh() on each source to update its state
   * 2. Re-discovers commands from each source
   * 3. Removes old commands and registers new ones
   *
   * Useful when services change or new MCP tools become available
   *
   * @returns Promise that resolves when all sources have been refreshed
   */
  async refresh(): Promise<void> {
    const refreshPromises = Array.from(this.dynamicSources.values()).map(
      async (source) => {
        try {
          // Refresh source state
          await source.refresh();

          // Get updated commands
          const commands = await source.discover();

          // Remove old commands from this namespace
          const existing = this.list(source.namespace);
          for (const cmd of existing) {
            this.unregister(cmd.name, cmd.namespace);
          }

          // Register new commands
          this.registerMany(commands);
        } catch (error) {
          console.error(
            `Failed to refresh commands from ${source.namespace}:`,
            error
          );
        }
      }
    );

    await Promise.all(refreshPromises);
  }

  /**
   * Get command by full name (namespace:command or just command)
   *
   * @param fullName - Full command name with optional namespace
   * @returns Command definition or undefined
   *
   * @example
   * registry.resolve('services:health')
   * registry.resolve('help')
   */
  resolve(fullName: string): Command | undefined {
    if (fullName.includes(':')) {
      const [namespace, name] = fullName.split(':', 2);
      return this.get(name || '', namespace || '');
    }

    // Try to find command without namespace
    return this.get(fullName);
  }

  /**
   * Search commands by keyword
   *
   * Searches in:
   * - Command names
   * - Command descriptions
   * - Namespaces
   *
   * @param keyword - Search keyword (case-insensitive)
   * @returns Array of matching commands
   */
  search(keyword: string): Command[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.commands.values()).filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerKeyword) ||
        cmd.description.toLowerCase().includes(lowerKeyword) ||
        cmd.namespace?.toLowerCase().includes(lowerKeyword) ||
        cmd.aliases?.some((alias) =>
          alias.toLowerCase().includes(lowerKeyword)
        )
    );
  }

  /**
   * Get all commands organized by category
   *
   * @returns Map of category to commands
   */
  getByCategory(): Map<string, Command[]> {
    const categories = new Map<string, Command[]>();

    for (const command of this.commands.values()) {
      const category = command.category || 'General';
      const existing = categories.get(category) || [];
      existing.push(command);
      categories.set(category, existing);
    }

    return categories;
  }

  /**
   * Get statistics about registered commands
   *
   * @returns Command registry statistics
   */
  getStats(): {
    totalCommands: number;
    namespaces: number;
    dynamicSources: number;
    categories: number;
  } {
    return {
      totalCommands: this.commands.size,
      namespaces: this.listNamespaces().length,
      dynamicSources: this.dynamicSources.size,
      categories: this.getByCategory().size,
    };
  }

  /**
   * Resolve alias to command (O(1) lookup)
   * Performance optimization from O(N) to O(1)
   *
   * @param alias - Alias to resolve
   * @returns Command definition or undefined
   */
  resolveAlias(alias: string): Command | undefined {
    const key = this.aliasIndex.get(alias);
    if (!key) {
      return undefined;
    }
    return this.commands.get(key);
  }

  /**
   * Remove all aliases for a given command key
   * Internal utility for cleanup
   *
   * @param commandKey - Internal command key
   */
  private _removeAliasesForKey(commandKey: string): void {
    const command = this.commands.get(commandKey);
    if (!command || !command.aliases) {
      return;
    }

    for (const alias of command.aliases) {
      this.aliasIndex.delete(alias);
    }
  }

  /**
   * Clear all registered commands
   *
   * WARNING: This removes all commands including static and dynamic
   */
  clear(): void {
    this.commands.clear();
    this.aliasIndex.clear(); // Also clear alias index
  }

  /**
   * Clear commands from a specific namespace
   *
   * @param namespace - Namespace to clear
   */
  clearNamespace(namespace: string): void {
    const commands = this.list(namespace);
    for (const cmd of commands) {
      this.unregister(cmd.name, cmd.namespace);
    }
  }

  /**
   * Generate unique command key for internal storage
   *
   * @param name - Command name
   * @param namespace - Optional namespace
   * @returns Unique key string
   */
  private getCommandKey(name: string, namespace?: string): string {
    return namespace ? `${namespace}:${name}` : name;
  }
}

/**
 * Factory function to create a new CommandRegistry instance
 *
 * @returns New CommandRegistry instance
 */
export function createCommandRegistry(): CommandRegistry {
  return new CommandRegistry();
}
