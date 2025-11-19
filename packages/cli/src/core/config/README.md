# Configuration Management

Multi-source configuration system for Nexus CLI with profile management, workspace detection, and environment variable support.

## Quick Start

```typescript
import { ConfigManager, ProfileManager, WorkspaceDetector } from './config/index.js';

// Initialize managers
const configManager = new ConfigManager();
const profileManager = new ProfileManager(configManager);
const workspaceDetector = new WorkspaceDetector();

// Get merged configuration
const config = await configManager.getConfig();

// Detect workspace
const workspace = await workspaceDetector.detect();

// Switch profiles
await profileManager.switchProfile('production');
```

## Configuration Sources

Configuration is merged from multiple sources (highest priority first):

1. **Environment Variables** - `NEXUS_*` env vars
2. **Workspace Config** - `.nexus.toml` in project root
3. **Profile Config** - Active profile in `~/.nexus/config.toml`
4. **Default Config** - Hardcoded fallback values

### Example Merge

```yaml
# ~/.nexus/config.toml (profile: default)
services:
  apiUrl: http://localhost:9092

# ./.nexus.toml (workspace)
services:
  timeout: 60000

# Environment
NEXUS_API_URL=https://api.production.com

# Final merged config
services:
  apiUrl: https://api.production.com  # From env var
  timeout: 60000                       # From workspace
  retries: 3                           # From default
```

## API Reference

### ConfigManager

#### Methods
```typescript
// Initialize config directory
initialize(): Promise<void>

// Load global config
loadGlobalConfig(): Promise<GlobalConfig>

// Save global config
saveGlobalConfig(config: GlobalConfig): Promise<void>

// Load workspace config
loadWorkspaceConfig(cwd?: string): Promise<NexusConfig | null>

// Get current profile
getCurrentProfile(): Promise<Profile>

// Get merged config
getConfig(cwd?: string): Promise<NexusConfig>

// Get specific value
getValue<T>(key: string, cwd?: string): Promise<T | undefined>

// Set value in profile
setValue(key: string, value: unknown): Promise<void>

// Create workspace config
initWorkspaceConfig(config: NexusConfig, cwd?: string): Promise<void>

// Clear cache
clearCache(): void
```

### ProfileManager

#### Methods
```typescript
// List all profiles
listProfiles(): Promise<Profile[]>

// Get current profile
getCurrentProfile(): Promise<Profile>

// Get profile by name
getProfile(name: string): Promise<Profile | null>

// Create new profile
createProfile(name: string, config: NexusConfig, setAsDefault?: boolean): Promise<Profile>

// Delete profile
deleteProfile(name: string): Promise<void>

// Switch to profile
switchProfile(name: string): Promise<void>

// Set default profile
setDefaultProfile(name: string): Promise<void>

// Update profile
updateProfile(name: string, config: Partial<NexusConfig>): Promise<void>

// Rename profile
renameProfile(oldName: string, newName: string): Promise<void>

// Export profile
exportProfile(name: string): Promise<Profile>
exportProfileToFile(name: string, filePath: string): Promise<void>

// Import profile
importProfile(profileData: Profile, overwrite?: boolean): Promise<void>
importProfileFromFile(filePath: string, overwrite?: boolean): Promise<void>

// Copy profile
copyProfile(sourceName: string, targetName: string, setAsDefault?: boolean): Promise<Profile>
```

### WorkspaceDetector

#### Methods
```typescript
// Detect all workspace characteristics
detect(): Promise<WorkspaceInfo>

// Check if Nexus workspace
isNexusWorkspace(): Promise<boolean>

// Find workspace root
findNexusWorkspaceRoot(startDir?: string): Promise<string | null>
```

## Configuration Schema

```typescript
interface NexusConfig {
  workspace?: WorkspaceConfig;
  services?: ServicesConfig;
  auth?: AuthConfig;
  defaults?: DefaultsConfig;
  agent?: AgentConfig;
  plugins?: PluginsConfig;
  mcp?: MCPConfig;
  shortcuts?: Shortcut[];
}

interface ServicesConfig {
  apiUrl?: string;          // API endpoint URL
  mcpUrl?: string;          // MCP service URL
  timeout?: number;         // Request timeout (ms)
  retries?: number;         // Max retry attempts
}

interface AuthConfig {
  apiKey?: string;          // API key (use ${ENV_VAR})
  strategy?: 'api-key' | 'oauth' | 'jwt';
  token?: string;           // Auth token
}

interface DefaultsConfig {
  outputFormat?: 'text' | 'json' | 'yaml' | 'table' | 'stream-json';
  streaming?: boolean;      // Enable streaming
  verbose?: boolean;        // Verbose output
  quiet?: boolean;          // Quiet mode
}

interface AgentConfig {
  maxIterations?: number;   // Max agent iterations
  autoApproveSafe?: boolean; // Auto-approve safe ops
  workspace?: string;       // Agent workspace path
  budget?: number;          // Cost budget
}

interface PluginsConfig {
  enabled?: string[];       // Enabled plugins
  disabled?: string[];      // Disabled plugins
  autoUpdate?: boolean;     // Auto-update plugins
}

interface MCPConfig {
  autoStore?: boolean;      // Auto-store memories
  memoryTags?: string[];    // Default memory tags
  healthCheckInterval?: number; // Health check interval (ms)
}
```

## Workspace Detection

### Auto-Detected Information

```typescript
interface WorkspaceInfo {
  cwd: string;                        // Current directory
  type: 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
  name: string;                       // Project name
  gitRepo: boolean;                   // Is git repo
  gitBranch?: string;                 // Current branch
  gitRemote?: string;                 // Remote URL
  gitStatus?: string;                 // Git status
  dockerComposeFiles: string[];       // Compose files
  nexusConfig: NexusConfig | null;    // Nexus config
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo' | 'gradle' | 'maven';
}
```

### Detection Logic

**Project Type:**
- TypeScript: `package.json` + `tsconfig.json`
- Python: `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile`
- Go: `go.mod`, `go.sum`
- Rust: `Cargo.toml`, `Cargo.lock`
- Java: `pom.xml`, `build.gradle`, `build.gradle.kts`

**Package Manager:**
- pnpm: `pnpm-lock.yaml`
- yarn: `yarn.lock`
- npm: `package-lock.json`
- poetry: `poetry.lock`
- pip: `requirements.txt`
- cargo: `Cargo.lock`
- gradle: `build.gradle*`
- maven: `pom.xml`

## Examples

### Basic Configuration

```typescript
import { ConfigManager } from './config/index.js';

const configManager = new ConfigManager();

// Initialize (creates ~/.nexus/ if needed)
await configManager.initialize();

// Get merged config
const config = await configManager.getConfig();
console.log('API URL:', config.services?.apiUrl);

// Get specific value
const timeout = await configManager.getValue<number>('services.timeout');
console.log('Timeout:', timeout);

// Set value
await configManager.setValue('defaults.verbose', true);
```

### Profile Management

```typescript
import { ConfigManager, ProfileManager } from './config/index.js';

const configManager = new ConfigManager();
const profileManager = new ProfileManager(configManager);

// Create new profile
await profileManager.createProfile('staging', {
  services: {
    apiUrl: 'https://staging.example.com',
    timeout: 30000,
  },
  defaults: {
    outputFormat: 'json',
  },
});

// Switch to staging
await profileManager.switchProfile('staging');

// List all profiles
const profiles = await profileManager.listProfiles();
console.log('Profiles:', profiles.map(p => p.name));

// Export profile
await profileManager.exportProfileToFile('staging', './staging-profile.json');

// Import profile
await profileManager.importProfileFromFile('./prod-profile.json');
```

### Workspace Detection

```typescript
import { WorkspaceDetector } from './config/index.js';

const detector = new WorkspaceDetector();

// Detect current workspace
const workspace = await detector.detect();
console.log('Project:', workspace.name);
console.log('Type:', workspace.type);
console.log('Git branch:', workspace.gitBranch);
console.log('Package manager:', workspace.packageManager);

// Check if Nexus workspace
const isNexus = await detector.isNexusWorkspace();
if (isNexus) {
  console.log('This is a Nexus-enabled workspace');
}

// Find workspace root
const root = await detector.findNexusWorkspaceRoot();
if (root) {
  console.log('Workspace root:', root);
}
```

### Environment Variables

```typescript
// Use environment variables in config
// ~/.nexus/config.toml
services:
  apiUrl: ${NEXUS_API_URL}

// Or set directly
export NEXUS_API_URL=https://production.com
export NEXUS_API_KEY=secret-key-123

// Config automatically picks up env vars
const config = await configManager.getConfig();
console.log(config.services?.apiUrl); // https://production.com
```

### Workspace Configuration

```typescript
import { ConfigManager } from './config/index.js';

const configManager = new ConfigManager();

// Create workspace config
await configManager.initWorkspaceConfig({
  workspace: {
    type: 'typescript',
    name: 'my-project',
  },
  services: {
    timeout: 60000, // Override default timeout
  },
  defaults: {
    outputFormat: 'table',
  },
});

// .nexus.toml created in current directory
```

## File Formats

### Global Config (`~/.nexus/config.toml`)

```yaml
profiles:
  - name: default
    config:
      services:
        apiUrl: http://localhost:9092
        mcpUrl: http://localhost:9000
        timeout: 30000
        retries: 3
      defaults:
        outputFormat: text
        streaming: true
        verbose: false
      agent:
        maxIterations: 20
        autoApproveSafe: false
      plugins:
        enabled: []
        autoUpdate: false
      mcp:
        autoStore: true
        healthCheckInterval: 60000
    default: true

currentProfile: default
pluginDirectory: ~/.nexus/plugins
cacheDirectory: ~/.nexus/cache
updateCheck: true
telemetry: false
```

### Workspace Config (`.nexus.toml`)

```yaml
workspace:
  name: my-project
  type: typescript

services:
  timeout: 60000  # Project-specific timeout

defaults:
  outputFormat: table
  verbose: true

shortcuts:
  - name: deploy
    command: agent run deploy-script.ts
    description: Deploy to production
```

## Validation

All configuration is validated using Zod schemas:

```typescript
// Example: Invalid config
const config = {
  services: {
    apiUrl: 'not-a-url', // Invalid URL
    timeout: -1,         // Negative number
  },
};

// Throws ConfigurationError with details
await configManager.saveGlobalConfig(config);
// Error: Invalid global configuration: services.apiUrl must be a valid URL
```

## Error Handling

```typescript
import { ConfigurationError } from './config/index.js';

try {
  await profileManager.switchProfile('nonexistent');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Config error:', error.message);
    console.error('Context:', error.context);
  }
}
```

## Best Practices

1. **Use Profiles for Environments**
   - Create profiles for dev, staging, production
   - Use `switchProfile()` to change environments
   - Never hardcode production credentials

2. **Store Secrets in Environment Variables**
   ```yaml
   auth:
     apiKey: ${NEXUS_API_KEY}  # Good
     # apiKey: hardcoded-key   # Bad
   ```

3. **Workspace-Specific Overrides**
   - Use `.nexus.toml` for project-specific settings
   - Keep workspace config minimal (only overrides)
   - Commit `.nexus.toml` to version control

4. **Profile Organization**
   ```typescript
   // Create profiles for different purposes
   await profileManager.createProfile('dev', devConfig);
   await profileManager.createProfile('staging', stagingConfig);
   await profileManager.createProfile('prod', prodConfig);
   ```

5. **Clear Cache After Changes**
   ```typescript
   await configManager.setValue('key', 'value');
   configManager.clearCache(); // Ensure next getConfig() sees changes
   ```

## Migration Guide

### From Old Config Format

```typescript
// Old format (config.json)
{
  "apiUrl": "http://localhost:9092",
  "brainUrl": "http://localhost:9000"  // Old field
}

// New format (config.toml)
services:
  apiUrl: http://localhost:9092
  mcpUrl: http://localhost:9000  # Renamed from brainUrl
```

### Converting Existing Config

```typescript
import { ConfigManager } from './config/index.js';
import fs from 'fs-extra';

// Read old config
const oldConfig = await fs.readJson('~/.nexus-old/config.json');

// Create new config
const configManager = new ConfigManager();
await configManager.initialize();

// Migrate values
await configManager.setValue('services.apiUrl', oldConfig.apiUrl);
await configManager.setValue('services.mcpUrl', oldConfig.brainUrl);
```

## Troubleshooting

### Config Not Loading
```bash
# Check if config exists
ls -la ~/.nexus/config.toml

# Validate config syntax
cat ~/.nexus/config.toml | npx yaml-validate

# Recreate config
rm ~/.nexus/config.toml
# Restart CLI (will auto-create default config)
```

### Profile Not Found
```typescript
// List available profiles
const profiles = await profileManager.listProfiles();
console.log('Available:', profiles.map(p => p.name));

// Check current profile
const current = await profileManager.getCurrentProfile();
console.log('Current:', current.name);
```

### Workspace Not Detected
```typescript
const detector = new WorkspaceDetector();
const workspace = await detector.detect();

// Check detection results
console.log('Type:', workspace.type);        // May be 'unknown'
console.log('Git:', workspace.gitRepo);      // May be false
console.log('Compose:', workspace.dockerComposeFiles.length);
```

## Performance

- **Config load:** ~5ms (includes file I/O + merge)
- **Workspace detect:** ~20ms (includes git commands)
- **Profile switch:** ~10ms (includes save + cache clear)

## Security Notes

⚠️ **Config files may contain sensitive data:**
- API keys (if not using env vars)
- Auth tokens
- Service URLs (may reveal infrastructure)

**Recommendations:**
- Use `${ENV_VAR}` syntax for all secrets
- Secure `~/.nexus/` directory (chmod 700)
- Add `.nexus.toml` to `.gitignore` if it contains secrets
- Use profile export with caution (may contain credentials)
