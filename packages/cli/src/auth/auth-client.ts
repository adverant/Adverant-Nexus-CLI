/**
 * Nexus Authentication Client
 *
 * Handles all authentication operations with Nexus Auth service
 */

import axios, { AxiosInstance } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserInfo,
  Organization,
  APIKey,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  WhoAmIResponse,
  AuthError,
} from '@nexus-cli/types';

export interface AuthClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
}

export class AuthClient {
  private client: AxiosInstance;

  constructor(config: AuthClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const authError: AuthError = {
            code: error.response.data?.code || 'UNKNOWN_ERROR',
            message: error.response.data?.message || error.message,
            details: error.response.data?.details,
          };
          throw authError;
        }
        throw error;
      }
    );
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/register', request);
    return response.data;
  }

  /**
   * Login with email and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', request);
    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.client.post<RefreshTokenResponse>('/auth/refresh', request);
    return response.data;
  }

  /**
   * Logout (revoke tokens)
   */
  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<UserInfo> {
    const response = await this.client.get<UserInfo>('/users/me');
    return response.data;
  }

  /**
   * Get whoami info (user + org + permissions)
   */
  async whoami(): Promise<WhoAmIResponse> {
    const response = await this.client.get<WhoAmIResponse>('/auth/whoami');
    return response.data;
  }

  /**
   * List user's organizations
   */
  async listOrganizations(): Promise<Organization[]> {
    const response = await this.client.get<{ organizations: Organization[] }>('/organizations');
    return response.data.organizations;
  }

  /**
   * Get organization details
   */
  async getOrganization(orgId: string): Promise<Organization> {
    const response = await this.client.get<Organization>(`/organizations/${orgId}`);
    return response.data;
  }

  /**
   * Create a new organization
   */
  async createOrganization(name: string, slug?: string): Promise<Organization> {
    const response = await this.client.post<Organization>('/organizations', { name, slug });
    return response.data;
  }

  /**
   * Create an API key
   */
  async createAPIKey(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    const response = await this.client.post<CreateAPIKeyResponse>('/api-keys', request);
    return response.data;
  }

  /**
   * List API keys (without secrets)
   */
  async listAPIKeys(organizationId?: string): Promise<APIKey[]> {
    const params = organizationId ? { organization_id: organizationId } : {};
    const response = await this.client.get<{ api_keys: APIKey[] }>('/api-keys', { params });
    return response.data.api_keys;
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId: string): Promise<void> {
    await this.client.delete(`/api-keys/${keyId}`);
  }

  /**
   * Get API key details
   */
  async getAPIKey(keyId: string): Promise<APIKey> {
    const response = await this.client.get<APIKey>(`/api-keys/${keyId}`);
    return response.data;
  }

  /**
   * Validate API key format
   */
  static isValidAPIKeyFormat(key: string): boolean {
    return /^brain_[A-Za-z0-9_-]{64}$/.test(key);
  }

  /**
   * Get API key prefix from full key
   */
  static getKeyPrefix(key: string): string {
    return key.substring(0, 20);
  }
}
