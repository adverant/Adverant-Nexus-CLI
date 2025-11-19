/**
 * Configuration Management Module Exports
 *
 * Configuration, profiles, and workspace detection for Nexus CLI
 */

export { ConfigManager, configManager } from './config-manager.js';
export { ProfileManager, createProfileManager } from './profile-manager.js';
export { WorkspaceDetector, createWorkspaceDetector } from './workspace-detector.js';
export type { WorkspaceInfo } from './workspace-detector.js';
