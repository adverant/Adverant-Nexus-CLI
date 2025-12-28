/**
 * Credentials Manager
 *
 * Secure storage and management of authentication credentials
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { AuthCredentials, APIKey } from '@adverant/nexus-cli-types';

export interface CredentialsManagerConfig {
  credentialsDir?: string;
  credentialsFile?: string;
  apiKeysFile?: string;
}

export class CredentialsManager {
  private credentialsDir: string;
  private credentialsPath: string;
  private apiKeysPath: string;

  constructor(config: CredentialsManagerConfig = {}) {
    this.credentialsDir = config.credentialsDir || path.join(os.homedir(), '.nexus');
    this.credentialsPath = config.credentialsFile || path.join(this.credentialsDir, 'credentials.json');
    this.apiKeysPath = config.apiKeysFile || path.join(this.credentialsDir, 'api-keys.json');

    this.ensureCredentialsDir();
  }

  /**
   * Ensure credentials directory exists with secure permissions
   */
  private async ensureCredentialsDir(): Promise<void> {
    await fs.ensureDir(this.credentialsDir);

    // Set secure permissions (0700 - read/write/execute for owner only)
    try {
      await fs.chmod(this.credentialsDir, 0o700);
    } catch (error) {
      console.warn('Warning: Could not set secure permissions on credentials directory');
    }
  }

  /**
   * Save credentials securely
   */
  async saveCredentials(credentials: AuthCredentials): Promise<void> {
    await fs.writeJSON(this.credentialsPath, credentials, { spaces: 2 });

    // Set secure file permissions (0600 - read/write for owner only)
    try {
      await fs.chmod(this.credentialsPath, 0o600);
    } catch (error) {
      console.warn('Warning: Could not set secure permissions on credentials file');
    }
  }

  /**
   * Load credentials
   */
  async loadCredentials(): Promise<AuthCredentials | null> {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        return await fs.readJSON(this.credentialsPath);
      }
      return null;
    } catch (error) {
      console.error('Error loading credentials:', error);
      return null;
    }
  }

  /**
   * Clear credentials (logout)
   */
  async clearCredentials(): Promise<void> {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        await fs.remove(this.credentialsPath);
      }
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }

  /**
   * Check if credentials are expired
   */
  isExpired(credentials: AuthCredentials): boolean {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();

    // Consider expired if less than 5 minutes remaining
    const bufferMs = 5 * 60 * 1000;
    return expiresAt.getTime() - now.getTime() < bufferMs;
  }

  /**
   * Update credentials (after token refresh)
   */
  async updateCredentials(updates: Partial<AuthCredentials>): Promise<void> {
    const current = await this.loadCredentials();
    if (current) {
      const updated = { ...current, ...updates };
      await this.saveCredentials(updated);
    }
  }

  /**
   * Get current organization ID
   */
  async getCurrentOrganizationId(): Promise<string | null> {
    const credentials = await this.loadCredentials();
    return credentials?.organization_id || null;
  }

  /**
   * Set current organization
   */
  async setCurrentOrganization(organizationId: string): Promise<void> {
    await this.updateCredentials({ organization_id: organizationId });
  }

  /**
   * Get current app ID
   */
  async getCurrentAppId(): Promise<string | null> {
    const credentials = await this.loadCredentials();
    return credentials?.app_id || null;
  }

  /**
   * Set current app
   */
  async setCurrentApp(appId: string): Promise<void> {
    await this.updateCredentials({ app_id: appId });
  }

  /**
   * Save API key locally (for reference only, not the secret)
   */
  async saveAPIKeyReference(apiKey: Omit<APIKey, 'key'>): Promise<void> {
    let apiKeys: Omit<APIKey, 'key'>[] = [];

    try {
      if (await fs.pathExists(this.apiKeysPath)) {
        apiKeys = await fs.readJSON(this.apiKeysPath);
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      apiKeys = [];
    }

    // Add or update API key
    const existingIndex = apiKeys.findIndex((k) => k.id === apiKey.id);
    if (existingIndex >= 0) {
      apiKeys[existingIndex] = apiKey;
    } else {
      apiKeys.push(apiKey);
    }

    await fs.writeJSON(this.apiKeysPath, apiKeys, { spaces: 2 });

    try {
      await fs.chmod(this.apiKeysPath, 0o600);
    } catch (error) {
      console.warn('Warning: Could not set secure permissions on API keys file');
    }
  }

  /**
   * List saved API key references
   */
  async listAPIKeyReferences(): Promise<Omit<APIKey, 'key'>[]> {
    try {
      if (await fs.pathExists(this.apiKeysPath)) {
        return await fs.readJSON(this.apiKeysPath);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Remove API key reference
   */
  async removeAPIKeyReference(keyId: string): Promise<void> {
    try {
      if (await fs.pathExists(this.apiKeysPath)) {
        let apiKeys: Omit<APIKey, 'key'>[] = await fs.readJSON(this.apiKeysPath);
        apiKeys = apiKeys.filter((k) => k.id !== keyId);
        await fs.writeJSON(this.apiKeysPath, apiKeys, { spaces: 2 });
      }
    } catch (error) {
      console.error('Error removing API key reference:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const credentials = await this.loadCredentials();
    if (!credentials) return false;

    return !this.isExpired(credentials);
  }

  /**
   * Get credentials directory path
   */
  getCredentialsDir(): string {
    return this.credentialsDir;
  }

  /**
   * Get credentials file path
   */
  getCredentialsPath(): string {
    return this.credentialsPath;
  }
}
