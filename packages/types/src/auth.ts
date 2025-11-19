/**
 * Authentication Type Definitions
 *
 * Types for Nexus Auth integration (company, app, user authentication)
 */

export interface AuthCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'Bearer';
  user_id: string;
  email: string;
  organization_id?: string;
  app_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organization_name?: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'Bearer';
  user?: UserInfo;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'Bearer';
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  subscription_tier: string;
  status: 'active' | 'suspended' | 'deactivated';
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  settings?: Record<string, any>;
  features?: string[];
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  department_id?: string;
  permissions?: string[];
  joined_at: string;
}

export interface APIKey {
  id: string;
  key_prefix: string; // First 12 characters for display
  name: string;
  organization_id?: string;
  app_id?: string;
  environment: 'production' | 'staging' | 'development';
  permissions: string[];
  rate_limit_rpm?: number;
  allowed_ips?: string[];
  allowed_services?: string[];
  expires_at?: string;
  revoked: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  environment: 'production' | 'staging' | 'development';
  permissions: string[];
  rate_limit_rpm?: number;
  allowed_ips?: string[];
  allowed_services?: string[];
  expires_at?: string;
  organization_id?: string;
  app_id?: string;
}

export interface CreateAPIKeyResponse {
  id: string;
  key: string; // Full key - only shown once!
  key_prefix: string;
  name: string;
  environment: string;
  permissions: string[];
  created_at: string;
  warning: string;
}

export interface App {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  monthly_token_quota?: number;
  tokens_used_this_month: number;
  status: 'active' | 'suspended';
  created_at: string;
  settings?: Record<string, any>;
}

export interface AppUser {
  id: string;
  app_id: string;
  external_user_id: string; // External system's user ID
  email?: string;
  display_name?: string;
  avatar_url?: string;
  metadata?: Record<string, any>;
  total_requests: number;
  total_tokens: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface AuthContext {
  authenticated: boolean;
  user?: UserInfo;
  organization?: Organization;
  app?: App;
  permissions: string[];
  api_key_id?: string;
  rate_limit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export interface AttributionHeaders {
  'X-Organization-ID'?: string;
  'X-App-ID'?: string;
  'X-End-User-ID'?: string;
  'X-End-User-Email'?: string;
  'X-End-User-Name'?: string;
  'X-Department-ID'?: string;
  'X-Session-ID'?: string;
  'X-Request-Source'?: 'cli' | 'web' | 'mobile' | 'api';
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_SUSPENDED'
  | 'APIKEY_INVALID'
  | 'APIKEY_REVOKED'
  | 'APIKEY_EXPIRED'
  | 'APIKEY_IP_NOT_WHITELISTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PERMISSION_DENIED';

export interface WhoAmIResponse {
  user: UserInfo;
  organization?: Organization;
  app?: App;
  role?: string;
  permissions: string[];
  api_key?: {
    id: string;
    name: string;
    key_prefix: string;
    environment: string;
  };
}
