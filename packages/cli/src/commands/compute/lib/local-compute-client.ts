/**
 * Local Compute Client
 *
 * HTTP/WebSocket client for communicating with the local compute agent.
 */

import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import type {
  LocalComputeJob,
  ComputeAgentStatus,
  JobStatus,
  JobResources,
  MLFramework,
} from '@adverant-nexus/types';

export interface LocalComputeClientConfig {
  port?: number;
  host?: string;
  timeout?: number;
}

export interface JobSubmitOptions {
  name: string;
  script: string;
  scriptPath?: string;
  workingDir?: string;
  environment?: Record<string, string>;
  framework?: MLFramework;
  resources?: Partial<JobResources>;
}

export class LocalComputeClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private socket: Socket | null = null;

  constructor(config: LocalComputeClientConfig = {}) {
    const port = config.port || 9200;
    const host = config.host || 'localhost';

    this.baseUrl = `http://${host}:${port}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if the agent is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200 && response.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<ComputeAgentStatus> {
    const response = await this.client.get('/status');
    return response.data;
  }

  /**
   * Submit a job for execution
   */
  async submitJob(options: JobSubmitOptions): Promise<LocalComputeJob> {
    const response = await this.client.post('/jobs', {
      name: options.name,
      script: options.script,
      scriptPath: options.scriptPath,
      workingDir: options.workingDir || process.cwd(),
      environment: options.environment || {},
      framework: options.framework || 'generic',
      resources: {
        gpu: options.resources?.gpu ?? true,
        gpuMemoryPercent: options.resources?.gpuMemoryPercent,
        cpuCores: options.resources?.cpuCores,
        memoryGb: options.resources?.memoryGb,
      },
    });

    return response.data;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<LocalComputeJob | null> {
    try {
      const response = await this.client.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List jobs
   */
  async listJobs(options?: {
    status?: JobStatus;
    limit?: number;
  }): Promise<LocalComputeJob[]> {
    const params = new URLSearchParams();
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }

    const response = await this.client.get('/jobs', { params });
    return response.data.jobs || [];
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/jobs/${jobId}/cancel`);
      return response.data.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string, tail?: number): Promise<string[]> {
    const params = new URLSearchParams();
    if (tail) {
      params.set('tail', tail.toString());
    }

    const response = await this.client.get(`/jobs/${jobId}/logs`, { params });
    return response.data.logs || [];
  }

  /**
   * Stream job logs in real-time via WebSocket
   */
  async streamLogs(
    jobId: string,
    onLog: (line: string) => void,
    onComplete?: (exitCode: number) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.socket!.emit('subscribe:logs', { jobId });
      });

      this.socket.on('log', (data: { line: string }) => {
        onLog(data.line);
      });

      this.socket.on('job:completed', (data: { exitCode: number }) => {
        if (onComplete) {
          onComplete(data.exitCode);
        }
        this.disconnectSocket();
        resolve();
      });

      this.socket.on('job:failed', (data: { error: string }) => {
        if (onError) {
          onError(data.error);
        }
        this.disconnectSocket();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect to agent: ${error.message}`));
      });

      this.socket.on('disconnect', () => {
        resolve();
      });

      // Handle SIGINT to gracefully disconnect
      process.on('SIGINT', () => {
        this.disconnectSocket();
        process.exit(0);
      });
    });
  }

  /**
   * Execute code in a kernel
   */
  async executeCode(
    code: string,
    kernelId?: string
  ): Promise<{
    executionCount: number;
    status: 'ok' | 'error' | 'abort';
    outputs: any[];
    error?: { name: string; value: string; traceback: string[] };
    duration: number;
  }> {
    const response = await this.client.post('/execute', {
      code,
      kernelId,
    });

    return response.data;
  }

  /**
   * Create a new kernel session
   */
  async createKernel(language: 'python' | 'r' = 'python'): Promise<{
    id: string;
    language: string;
    status: string;
  }> {
    const response = await this.client.post('/kernels', { language });
    return response.data;
  }

  /**
   * List active kernels
   */
  async listKernels(): Promise<
    Array<{
      id: string;
      language: string;
      status: string;
      executionCount: number;
    }>
  > {
    const response = await this.client.get('/kernels');
    return response.data.kernels || [];
  }

  /**
   * Shutdown a kernel
   */
  async shutdownKernel(kernelId: string): Promise<void> {
    await this.client.delete(`/kernels/${kernelId}`);
  }

  /**
   * Interrupt kernel execution
   */
  async interruptKernel(kernelId: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/kernels/${kernelId}/interrupt`);
      return response.data.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Stream kernel output in real-time
   */
  async streamKernelOutput(
    kernelId: string,
    onOutput: (output: any) => void,
    onResult?: (result: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        transports: ['websocket'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        this.socket!.emit('subscribe:kernel', { kernelId });
      });

      this.socket.on('kernel:output', (data: { kernelId: string; output: any }) => {
        if (data.kernelId === kernelId) {
          onOutput(data.output);
        }
      });

      this.socket.on('kernel:result', (data: { kernelId: string; result: any }) => {
        if (data.kernelId === kernelId && onResult) {
          onResult(data.result);
          this.disconnectSocket();
          resolve();
        }
      });

      this.socket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect: ${error.message}`));
      });

      this.socket.on('disconnect', () => {
        resolve();
      });
    });
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    await this.client.post('/shutdown');
  }

  /**
   * Disconnect WebSocket
   */
  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Close client and cleanup resources
   */
  close(): void {
    this.disconnectSocket();
  }
}

export default LocalComputeClient;
