/**
 * Command Router Tests
 *
 * Comprehensive tests for command routing, validation, and middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCommandRegistry,
  createCommandRouter,
  type Command,
  type CommandArgs,
  type CommandContext,
  type CommandResult,
  type DynamicCommandSource,
} from '../index.js';

// Mock context
const createMockContext = (overrides?: Partial<CommandContext>): CommandContext => ({
  cwd: '/test',
  config: {},
  services: new Map(),
  verbose: false,
  quiet: false,
  outputFormat: 'text',
  transport: null,
  ...overrides,
});

describe('CommandRegistry', () => {
  let registry: ReturnType<typeof createCommandRegistry>;

  beforeEach(() => {
    registry = createCommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command: Command = {
        name: 'test',
        description: 'Test command',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toEqual(command);
    });

    it('should register a command with namespace', () => {
      const command: Command = {
        name: 'health',
        namespace: 'services',
        description: 'Health check',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);

      expect(registry.has('health', 'services')).toBe(true);
      expect(registry.get('health', 'services')).toEqual(command);
    });

    it('should warn when overwriting existing command', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const command1: Command = {
        name: 'test',
        description: 'Test 1',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      const command2: Command = {
        name: 'test',
        description: 'Test 2',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command1);
      registry.register(command2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('registerMany', () => {
    it('should register multiple commands', () => {
      const commands: Command[] = [
        {
          name: 'cmd1',
          description: 'Command 1',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
        {
          name: 'cmd2',
          description: 'Command 2',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      registry.registerMany(commands);

      expect(registry.has('cmd1')).toBe(true);
      expect(registry.has('cmd2')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a command', () => {
      const command: Command = {
        name: 'test',
        description: 'Test',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);
      expect(registry.has('test')).toBe(true);

      registry.unregister('test');
      expect(registry.has('test')).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all commands', () => {
      const commands: Command[] = [
        {
          name: 'cmd1',
          description: 'Command 1',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
        {
          name: 'cmd2',
          namespace: 'services',
          description: 'Command 2',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      registry.registerMany(commands);

      const allCommands = registry.list();
      expect(allCommands).toHaveLength(2);
    });

    it('should filter by namespace', () => {
      const commands: Command[] = [
        {
          name: 'cmd1',
          namespace: 'services',
          description: 'Command 1',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
        {
          name: 'cmd2',
          namespace: 'graphrag',
          description: 'Command 2',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      registry.registerMany(commands);

      const serviceCommands = registry.list('services');
      expect(serviceCommands).toHaveLength(1);
      expect(serviceCommands[0].namespace).toBe('services');
    });
  });

  describe('search', () => {
    it('should search by command name', () => {
      const command: Command = {
        name: 'health-check',
        description: 'Check service health',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);

      const results = registry.search('health');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('health-check');
    });

    it('should search by description', () => {
      const command: Command = {
        name: 'test',
        description: 'GraphRAG query command',
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);

      const results = registry.search('graphrag');
      expect(results).toHaveLength(1);
    });

    it('should search by alias', () => {
      const command: Command = {
        name: 'query',
        description: 'Query command',
        aliases: ['q', 'search'],
        handler: vi.fn().mockResolvedValue({ success: true }),
      };

      registry.register(command);

      const results = registry.search('search');
      expect(results).toHaveLength(1);
    });
  });

  describe('dynamic sources', () => {
    it('should register dynamic source', () => {
      const source: DynamicCommandSource = {
        namespace: 'dynamic',
        discover: vi.fn().mockResolvedValue([]),
        refresh: vi.fn().mockResolvedValue(undefined),
      };

      registry.registerDynamicSource(source);

      const stats = registry.getStats();
      expect(stats.dynamicSources).toBe(1);
    });

    it('should discover commands from dynamic sources', async () => {
      const commands: Command[] = [
        {
          name: 'dynamic1',
          namespace: 'dynamic',
          description: 'Dynamic command',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      const source: DynamicCommandSource = {
        namespace: 'dynamic',
        discover: vi.fn().mockResolvedValue(commands),
        refresh: vi.fn().mockResolvedValue(undefined),
      };

      registry.registerDynamicSource(source);
      await registry.discoverDynamicCommands();

      expect(registry.has('dynamic1', 'dynamic')).toBe(true);
      expect(source.discover).toHaveBeenCalled();
    });

    it('should handle discovery errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const source: DynamicCommandSource = {
        namespace: 'failing',
        discover: vi.fn().mockRejectedValue(new Error('Discovery failed')),
        refresh: vi.fn().mockResolvedValue(undefined),
      };

      registry.registerDynamicSource(source);
      await registry.discoverDynamicCommands();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to discover'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should refresh dynamic sources', async () => {
      const initialCommands: Command[] = [
        {
          name: 'old',
          namespace: 'dynamic',
          description: 'Old command',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      const updatedCommands: Command[] = [
        {
          name: 'new',
          namespace: 'dynamic',
          description: 'New command',
          handler: vi.fn().mockResolvedValue({ success: true }),
        },
      ];

      let callCount = 0;
      const source: DynamicCommandSource = {
        namespace: 'dynamic',
        discover: vi.fn().mockImplementation(async () => {
          callCount++;
          return callCount === 1 ? initialCommands : updatedCommands;
        }),
        refresh: vi.fn().mockResolvedValue(undefined),
      };

      registry.registerDynamicSource(source);
      await registry.discoverDynamicCommands();

      expect(registry.has('old', 'dynamic')).toBe(true);

      await registry.refresh();

      expect(registry.has('old', 'dynamic')).toBe(false);
      expect(registry.has('new', 'dynamic')).toBe(true);
      expect(source.refresh).toHaveBeenCalled();
    });
  });
});

describe('CommandRouter', () => {
  let registry: ReturnType<typeof createCommandRegistry>;
  let router: ReturnType<typeof createCommandRouter>;
  let context: CommandContext;

  beforeEach(() => {
    registry = createCommandRegistry();
    router = createCommandRouter(registry);
    context = createMockContext();
  });

  describe('route', () => {
    it('should execute command successfully', async () => {
      const handler = vi.fn().mockResolvedValue({
        success: true,
        data: 'test result',
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        handler,
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test result');
      expect(handler).toHaveBeenCalledWith({ _: [] }, context);
    });

    it('should return error for unknown command', async () => {
      const result = await router.route('unknown', { _: [] }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate arguments before execution', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      const validator = vi.fn().mockResolvedValue({
        valid: false,
        errors: [{ field: 'test', message: 'Invalid' }],
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        handler,
        validator,
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should add execution metadata', async () => {
      registry.register({
        name: 'test',
        namespace: 'services',
        description: 'Test command',
        handler: async () => ({ success: true }),
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.service).toBe('services');
    });

    it('should handle handler errors', async () => {
      registry.register({
        name: 'test',
        description: 'Test command',
        handler: async () => {
          throw new Error('Handler error');
        },
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler error');
    });
  });

  describe('middleware', () => {
    it('should execute middleware chain', async () => {
      const calls: string[] = [];

      router.use(async (cmd, args, ctx, next) => {
        calls.push('middleware1-before');
        const result = await next();
        calls.push('middleware1-after');
        return result;
      });

      router.use(async (cmd, args, ctx, next) => {
        calls.push('middleware2-before');
        const result = await next();
        calls.push('middleware2-after');
        return result;
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        handler: async () => {
          calls.push('handler');
          return { success: true };
        },
      });

      await router.route('test', { _: [] }, context);

      expect(calls).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });

    it('should allow middleware to modify result', async () => {
      router.use(async (cmd, args, ctx, next) => {
        const result = await next();
        return {
          ...result,
          data: { ...result.data, modified: true },
        };
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        handler: async () => ({ success: true, data: { original: true } }),
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.data).toEqual({ original: true, modified: true });
    });

    it('should allow middleware to short-circuit execution', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.use(async (cmd, args, ctx, next) => {
        // Don't call next(), return early
        return { success: false, error: 'Blocked by middleware' };
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        handler,
      });

      const result = await router.route('test', { _: [] }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Blocked by middleware');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('command resolution', () => {
    beforeEach(() => {
      // Register test commands
      registry.register({
        name: 'health',
        namespace: 'services',
        description: 'Health check',
        handler: async () => ({ success: true, data: 'services:health' }),
      });

      registry.register({
        name: 'query',
        namespace: 'graphrag',
        description: 'Query GraphRAG',
        aliases: ['q'],
        handler: async () => ({ success: true, data: 'graphrag:query' }),
      });
    });

    it('should resolve by namespace prefix', async () => {
      const result = await router.route('services:health', { _: [] }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('services:health');
    });

    it('should resolve by common namespace', async () => {
      const result = await router.route('health', { _: [] }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('services:health');
    });

    it('should resolve by alias', async () => {
      const result = await router.route('q', { _: [] }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('graphrag:query');
    });
  });

  describe('validateCommand', () => {
    it('should validate command exists', () => {
      registry.register({
        name: 'test',
        description: 'Test command',
        handler: async () => ({ success: true }),
      });

      const result = router.validateCommand('test', context);

      expect(result.valid).toBe(true);
      expect(result.command).toBeDefined();
    });

    it('should check authentication requirement', () => {
      registry.register({
        name: 'secure',
        description: 'Secure command',
        requiresAuth: true,
        handler: async () => ({ success: true }),
      });

      const result = router.validateCommand('secure', context);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires authentication');
    });

    it('should check workspace requirement', () => {
      registry.register({
        name: 'workspace-cmd',
        description: 'Workspace command',
        requiresWorkspace: true,
        handler: async () => ({ success: true }),
      });

      const result = router.validateCommand('workspace-cmd', context);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires a workspace');
    });
  });
});
