# Session Management

Session management for Nexus CLI with full checkpointing, history tracking, and context preservation.

## Quick Start

```typescript
import { SessionManager, HistoryManager, ContextManager } from './session/index.js';
import type { Session, SessionContext } from '@nexus-cli/types';

// Initialize managers
const sessionManager = new SessionManager();
const historyManager = new HistoryManager();
const contextManager = new ContextManager(workspace, config, services);

// Create a new session
const session = sessionManager.createSession('my-session', context, ['tag1', 'tag2']);

// Add command to history
const entry = historyManager.createEntry('deploy', args, 'mcp', true, 1500);
historyManager.add(entry);

// Update session with history
const updatedSession = sessionManager.updateSession(session, entry);

// Save session
await sessionManager.save(updatedSession);

// Load session later
const loaded = await sessionManager.load('my-session');

// Resume last session
const last = await sessionManager.resumeLast();
```

## Features

### Session Persistence
- **Storage:** `~/.nexus/sessions/<session-id>.json`
- **Format:** JSON with ISO date serialization
- **Capabilities:** Save, load, list, delete, export, import

### Context Management
Captures complete REPL state:
- Current working directory
- Workspace information
- Configuration (merged)
- Environment variables
- Service metadata
- Last command result
- Session namespace

### History Tracking
- **Storage:** `~/.nexus/history`
- **Max size:** 1000 entries (auto-trimmed)
- **Features:** Search, navigation (up/down), persistence

## API Reference

### SessionManager

#### Methods
```typescript
// Create new session
createSession(name: string, context: SessionContext, tags?: string[]): Session

// Update session with new history
updateSession(session: Session, entry: HistoryEntry, result?: SessionResult): Session

// Save to disk
save(session: Session): Promise<void>

// Load from disk
load(nameOrId: string): Promise<Session | null>

// List all sessions
list(): Promise<SessionSummary[]>

// Delete session
delete(nameOrId: string): Promise<void>

// Export to JSON
export(nameOrId: string): Promise<string>

// Import from JSON
import(data: string): Promise<Session>

// Resume last session
resumeLast(): Promise<Session | null>
```

### HistoryManager

#### Methods
```typescript
// Create history entry
createEntry(
  command: string,
  args: any,
  namespace?: string,
  success?: boolean,
  duration?: number
): HistoryEntry

// Add to history
add(entry: HistoryEntry): void

// Get by ID
get(id: string): HistoryEntry | undefined

// List recent (newest first)
list(limit?: number): HistoryEntry[]

// Search by query
search(query: string): HistoryEntry[]

// Clear all history
clear(): void

// Get all commands (for readline)
getCommands(): string[]

// Navigation (for up/down arrows)
getPrevious(): string | undefined
getNext(): string | undefined
resetIndex(): void
```

### ContextManager

#### Methods
```typescript
// Get current context
getContext(): REPLContext

// Update context
updateContext(updates: Partial<REPLContext>): void

// Namespace management
getNamespace(): string | undefined
setNamespace(namespace: string | undefined): void

// Last result management
getLastResult(): any
setLastResult(result: any): void

// Session tracking
incrementCommandCount(): void
getSessionDuration(): number
getMetadata(): object

// Export to session context
toSessionContext(): SessionContext

// Reset to initial state
reset(): void
```

## Session Structure

```typescript
interface Session {
  id: string;                    // Unique UUID
  name: string;                  // Human-readable name
  created: Date;                 // Creation timestamp
  updated: Date;                 // Last update timestamp
  context: SessionContext;       // Full execution context
  history: HistoryEntry[];       // Command history
  results: SessionResult[];      // Command results
  mcpMemories: string[];         // Linked MCP memory IDs
  metadata: SessionMetadata;     // Session metadata
}

interface SessionContext {
  workspace?: WorkspaceInfo;     // Workspace details
  cwd: string;                   // Working directory
  config: any;                   // Merged config
  environment: Record<string, string>;  // Env vars
  services: Record<string, any>; // Service metadata
}

interface HistoryEntry {
  id: string;                    // Unique UUID
  timestamp: Date;               // Execution time
  command: string;               // Command name
  args: CommandArgs;             // Command arguments
  namespace?: string;            // Command namespace
  success: boolean;              // Execution status
  duration: number;              // Execution time (ms)
}

interface SessionMetadata {
  totalCommands: number;         // Total count
  successfulCommands: number;    // Success count
  failedCommands: number;        // Failure count
  totalDuration: number;         // Total time (ms)
  lastCommand?: string;          // Last command name
  tags: string[];                // Session tags
}
```

## Examples

### Save Current Session
```typescript
import { SessionManager, ContextManager } from './session/index.js';

const sessionManager = new SessionManager();
const contextManager = new ContextManager(workspace, config, services);

// Create session from current context
const session = sessionManager.createSession(
  'development-work',
  contextManager.toSessionContext(),
  ['dev', 'feature-x']
);

// Save to disk
await sessionManager.save(session);
console.log(`Session saved: ${session.id}`);
```

### Resume Last Session
```typescript
import { SessionManager, ContextManager } from './session/index.js';

const sessionManager = new SessionManager();

// Load last session
const session = await sessionManager.resumeLast();
if (session) {
  console.log(`Resumed session: ${session.name}`);
  console.log(`Commands run: ${session.metadata.totalCommands}`);
  console.log(`Last command: ${session.metadata.lastCommand}`);
}
```

### Track Command History
```typescript
import { HistoryManager } from './session/index.js';

const historyManager = new HistoryManager();

// Execute command and track
const startTime = Date.now();
try {
  await executeCommand('deploy', args);
  const duration = Date.now() - startTime;

  const entry = historyManager.createEntry('deploy', args, 'mcp', true, duration);
  historyManager.add(entry);
} catch (error) {
  const duration = Date.now() - startTime;
  const entry = historyManager.createEntry('deploy', args, 'mcp', false, duration);
  historyManager.add(entry);
}

// Search history
const deployCommands = historyManager.search('deploy');
console.log(`Found ${deployCommands.length} deploy commands`);
```

### Export/Import Sessions
```typescript
import { SessionManager } from './session/index.js';
import fs from 'fs-extra';

const sessionManager = new SessionManager();

// Export session
const json = await sessionManager.export('my-session');
await fs.writeFile('/backup/session.json', json);

// Import session
const data = await fs.readFile('/backup/session.json', 'utf-8');
const imported = await sessionManager.import(data);
console.log(`Imported session: ${imported.name}`);
```

### Context Tracking
```typescript
import { ContextManager } from './session/index.js';

const contextManager = new ContextManager(workspace, config, services);

// Track command execution
contextManager.incrementCommandCount();
contextManager.setNamespace('mcp');

// Execute command
const result = await executeCommand();
contextManager.setLastResult(result);

// Get metadata
const metadata = contextManager.getMetadata();
console.log(`Commands run: ${metadata.commandCount}`);
console.log(`Session duration: ${metadata.sessionDuration}ms`);
```

## Migration from Old CLI

### Loading Old Sessions
Old sessions with `brainMemories` field are automatically migrated:

```typescript
// Old session format
{
  "brainMemories": ["mem-123", "mem-456"]
}

// Automatically converted to
{
  "mcpMemories": ["mem-123", "mem-456"]
}
```

### History File Migration
History files are forward-compatible. No migration needed.

## Best Practices

1. **Session Naming:** Use descriptive names (e.g., `feature-x-dev`, `production-deploy`)
2. **Tag Sessions:** Add tags for filtering (e.g., `['dev', 'bug-fix']`)
3. **Regular Saves:** Save sessions after significant milestones
4. **Context Updates:** Keep context updated with `updateContext()`
5. **History Cleanup:** Periodically clear old history with `clear()`
6. **Export Important:** Export critical sessions before major changes

## Troubleshooting

### Session Not Loading
- Check session exists: `sessionManager.list()`
- Verify session file: `~/.nexus/sessions/<id>.json`
- Check JSON validity: `cat ~/.nexus/sessions/<id>.json | jq`

### History Not Persisting
- Check file permissions: `~/.nexus/history`
- Verify history file: `cat ~/.nexus/history | jq`
- Check disk space: `df -h ~`

### Context Out of Sync
- Reset context: `contextManager.reset()`
- Update manually: `contextManager.updateContext({ cwd: newCwd })`

## Performance

- **Session save:** ~10ms (depends on history size)
- **Session load:** ~5ms (includes deserialization)
- **History add:** ~1ms (includes file write)
- **History search:** ~2ms (1000 entries)

## Security Notes

⚠️ **Session files may contain sensitive data:**
- Environment variables (may include secrets)
- Service credentials (if in context)
- Command arguments (may include passwords)

**Recommendations:**
- Secure `~/.nexus/` directory (chmod 700)
- Exclude from backups if sensitive
- Redact secrets before exporting sessions
