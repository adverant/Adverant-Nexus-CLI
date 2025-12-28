/**
 * HTTP Transport Client
 *
 * Production-ready HTTP client with:
 * - Automatic token refresh on 401
 * - Retry logic with exponential backoff
 * - Request/response interceptors
 * - Support for streaming responses (SSE)
 * - Attribution headers (organization, app, end-user)
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type {
  HTTPTransport,
  RequestOptions,
  TransportConfig,
  TransportError,
  RetryConfig,
  RequestMetrics,
} from '@adverant-nexus/types';

export class HTTPClient implements HTTPTransport {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private tokenRefreshCallback?: () => Promise<string>;
  private metrics: Map<string, RequestMetrics> = new Map();

  constructor(config: TransportConfig) {
    this.retryConfig = {
      maxAttempts: config.retries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
    };

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Apply auth configuration
    if (config.auth) {
      this.setAuth(config.auth);
    }

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Configure authentication
   */
  private setAuth(auth: TransportConfig['auth']): void {
    if (!auth) return;

    switch (auth.type) {
      case 'api-key':
        this.client.defaults.headers.common['X-API-Key'] = auth.credentials as string;
        break;

      case 'bearer':
        this.client.defaults.headers.common['Authorization'] = `Bearer ${auth.credentials}`;
        break;

      case 'basic': {
        const creds = auth.credentials as Record<string, string>;
        const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
        this.client.defaults.headers.common['Authorization'] = `Basic ${encoded}`;
        break;
      }

      case 'oauth':
        // OAuth handled via token refresh callback
        break;

      default:
        throw new Error(`Unsupported auth type: ${auth.type}`);
    }
  }

  /**
   * Set token refresh callback for automatic token renewal
   */
  setTokenRefreshCallback(callback: () => Promise<string>): void {
    this.tokenRefreshCallback = callback;
  }

  /**
   * Set attribution headers for multi-tenant tracking
   */
  setAttributionHeaders(headers: {
    organizationId?: string;
    appId?: string;
    endUserId?: string;
  }): void {
    if (headers.organizationId) {
      this.client.defaults.headers.common['X-Organization-ID'] = headers.organizationId;
    }
    if (headers.appId) {
      this.client.defaults.headers.common['X-App-ID'] = headers.appId;
    }
    if (headers.endUserId) {
      this.client.defaults.headers.common['X-End-User-ID'] = headers.endUserId;
    }
  }

  /**
   * Setup request interceptor
   */
  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Start metrics tracking
        const requestId = this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;

        this.metrics.set(requestId, {
          startTime: Date.now(),
          retries: 0,
          success: false,
        });

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Setup response interceptor with auto-retry and token refresh
   */
  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => {
        // Update metrics
        const requestId = response.config.headers['X-Request-ID'] as string;
        const metrics = this.metrics.get(requestId);
        if (metrics) {
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.success = true;
        }

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retry?: number };

        // Update metrics
        const requestId = config?.headers?.['X-Request-ID'] as string;
        const metrics = this.metrics.get(requestId);
        if (metrics) {
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.error = this.normalizeError(error);
        }

        // Handle 401 with token refresh
        if (error.response?.status === 401 && this.tokenRefreshCallback) {
          try {
            const newToken = await this.tokenRefreshCallback();
            this.client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            // Retry the request
            if (config) {
              config.headers['Authorization'] = `Bearer ${newToken}`;
              return this.client.request(config);
            }
          } catch (refreshError) {
            // Token refresh failed, propagate error
            return Promise.reject(this.normalizeError(refreshError as Error));
          }
        }

        // Handle retryable errors
        const shouldRetry = this.shouldRetry(error, config?._retry || 0);
        if (shouldRetry && config) {
          config._retry = (config._retry || 0) + 1;

          if (metrics) {
            metrics.retries = config._retry;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(
            this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, config._retry - 1),
            this.retryConfig.maxDelay
          );

          await this.sleep(delay);
          return this.client.request(config);
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= this.retryConfig.maxAttempts) {
      return false;
    }

    // Retry on network errors
    if (!error.response && error.code) {
      return this.retryConfig.retryableErrors?.includes(error.code) || false;
    }

    // Retry on 5xx errors and 429 (rate limit)
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429;
    }

    return false;
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    const config = this.buildAxiosConfig('GET', path, undefined, options);
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    const config = this.buildAxiosConfig('POST', path, data, options);
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    const config = this.buildAxiosConfig('PUT', path, data, options);
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    const config = this.buildAxiosConfig('PATCH', path, data, options);
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    const config = this.buildAxiosConfig('DELETE', path, undefined, options);
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * Build axios request configuration
   */
  private buildAxiosConfig(
    method: string,
    path: string,
    data?: any,
    options?: RequestOptions
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method,
      url: path,
      ...(options?.headers && { headers: options.headers }),
      ...(options?.params && { params: options.params }),
      ...(options?.timeout !== undefined && { timeout: options.timeout }),
      ...(options?.signal && { signal: options.signal }),
    };

    if (data) {
      config.data = data;
    }

    return config;
  }

  /**
   * Normalize error to TransportError
   */
  private normalizeError(error: Error | AxiosError): TransportError {
    if (axios.isAxiosError(error)) {
      const transportError: TransportError = {
        name: 'TransportError',
        message: error.message,
        code: error.code || 'UNKNOWN',
        ...(error.response?.status !== undefined && { statusCode: error.response.status }),
        ...(error.response?.data && { details: error.response.data }),
        retryable: this.shouldRetry(error, 0),
      };

      // Enhance error message
      if (error.response) {
        transportError.message = error.response.data?.message
          || `HTTP ${error.response.status}: ${error.response.statusText}`;
      }

      return transportError;
    }

    // Generic error
    return {
      name: 'TransportError',
      message: error.message || 'Unknown error',
      code: 'UNKNOWN',
      retryable: false,
    };
  }

  /**
   * Get request metrics
   */
  getMetrics(requestId?: string): RequestMetrics | Map<string, RequestMetrics> {
    if (requestId) {
      return this.metrics.get(requestId) || {
        startTime: 0,
        retries: 0,
        success: false,
      };
    }
    return this.metrics;
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create HTTP client
 */
export function createHTTPClient(config: TransportConfig): HTTPTransport {
  return new HTTPClient(config);
}
