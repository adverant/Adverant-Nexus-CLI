/**
 * Local Compute Agent
 *
 * Daemon process that registers with HPC Gateway and executes ML jobs locally.
 * Supports Apple Silicon (MPS), NVIDIA CUDA, and CPU-only execution.
 */

import { spawn, ChildProcess } from 'child_process';
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import EventEmitter from 'eventemitter3';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { detectHardware, type HardwareInfo } from './hardware-detection.js';
import { CredentialsManager } from '../../../auth/credentials-manager.js';
import type {
  LocalComputeConfig,
  AgentRegistration,
  ComputeAgentStatus,
  LocalAgentStatus,
  LocalComputeJob,
  JobStatus,
  JobMetrics,
  ComputeEvents,
  QueuedJob,
  JobProcess,
  KernelSession,
  ExecuteRequest,
  ExecuteResult,
  ExecutionOutput,
} from '../../../types/index.js';

/**
 * Path to agent PID file
 */
const NEXUS_DIR = path.join(os.homedir(), '.nexus');
const AGENT_PID_FILE = path.join(NEXUS_DIR, 'compute-agent.pid');

export class LocalComputeAgent extends EventEmitter<ComputeEvents> {
  private config: LocalComputeConfig;
  private hardware: HardwareInfo | null = null;
  private agentId: string | null = null;
  private gatewayConnected: boolean = false;
  private localServer: Server | null = null;
  private localApp: Express | null = null;
  private localIO: SocketIOServer | null = null;
  private credentialsManager: CredentialsManager;
  private accessToken: string | null = null;
  private userId: string | null = null;

  private jobQueue: QueuedJob[] = [];
  private currentJob: JobProcess | null = null;
  private completedJobs: Map<string, LocalComputeJob> = new Map();
  private jobLogs: Map<string, string[]> = new Map();

  // Kernel session management
  private kernelSessions: Map<string, KernelSession> = new Map();
  private kernelProcesses: Map<string, ChildProcess> = new Map();
  private kernelOutputBuffers: Map<string, ExecutionOutput[]> = new Map();

  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private running: boolean = false;

  private jobsCompleted: number = 0;
  private jobsFailed: number = 0;
  private totalComputeTime: number = 0;
  private startTime: Date | null = null;

  constructor(config: Partial<LocalComputeConfig> = {}) {
    super();

    this.config = {
      name: config.name || os.hostname(),
      gatewayUrl: config.gatewayUrl || 'https://api.adverant.ai/hpc',
      maxMemoryPercent: config.maxMemoryPercent ?? 75,
      allowRemoteJobs: config.allowRemoteJobs ?? false,
      idleTimeoutMinutes: config.idleTimeoutMinutes ?? 0, // 0 = never timeout
      apiPort: config.apiPort ?? 9200,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
    };

    this.credentialsManager = new CredentialsManager();
  }

  /**
   * Start the local compute agent
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Agent is already running');
    }

    // Ensure .nexus directory exists
    await fs.mkdir(NEXUS_DIR, { recursive: true });

    // Check if another agent is already running
    if (await this.isAnotherAgentRunning()) {
      throw new Error(
        'Another compute agent is already running. Stop it first with: nexus compute agent stop'
      );
    }

    // Load authentication credentials
    await this.loadCredentials();

    // Detect hardware
    this.hardware = await detectHardware();
    this.agentId = uuidv4();
    this.running = true;
    this.startTime = new Date();

    // Write PID file
    await fs.writeFile(AGENT_PID_FILE, process.pid.toString());

    // Start local API server
    await this.startLocalServer();

    // Connect to HPC Gateway
    await this.connectToGateway();

    // Start heartbeat
    this.startHeartbeat();

    // Reset idle timer
    this.resetIdleTimer();

    this.emit('connected', { agentId: this.agentId });

    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Stop the agent gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Shutdown all kernels
    await this.shutdownAllKernels();

    // Cancel current job if running
    if (this.currentJob) {
      await this.cancelJob(this.currentJob.job.id);
    }

    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect from gateway via REST API
    if (this.gatewayConnected && this.agentId) {
      try {
        await fetch(`${this.config.gatewayUrl}/api/local-compute/disconnect`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ agentId: this.agentId }),
        });
      } catch {
        // Ignore disconnect errors on shutdown
      }
      this.gatewayConnected = false;
    }

    // Stop local server
    if (this.localIO) {
      this.localIO.close();
      this.localIO = null;
    }
    if (this.localServer) {
      await new Promise<void>((resolve) => {
        this.localServer!.close(() => resolve());
      });
      this.localServer = null;
    }

    // Remove PID file
    await fs.unlink(AGENT_PID_FILE).catch(() => {});

    this.emit('disconnected', { reason: 'shutdown' });
  }

  /**
   * Submit a job for execution
   */
  async submitJob(job: Omit<LocalComputeJob, 'id' | 'status' | 'submittedAt' | 'logs'>): Promise<LocalComputeJob> {
    const fullJob: LocalComputeJob = {
      ...job,
      id: uuidv4(),
      status: 'queued',
      submittedAt: new Date(),
      logs: [],
    };

    this.jobQueue.push({
      job: fullJob,
      priority: 1,
      submittedAt: new Date(),
    });

    this.jobLogs.set(fullJob.id, []);

    // Process queue if not busy
    if (!this.currentJob) {
      this.processQueue();
    }

    this.resetIdleTimer();

    return fullJob;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): LocalComputeJob | null {
    // Check current job
    if (this.currentJob?.job.id === jobId) {
      return { ...this.currentJob.job, logs: this.jobLogs.get(jobId) || [] };
    }

    // Check queue
    const queued = this.jobQueue.find((q) => q.job.id === jobId);
    if (queued) {
      return queued.job;
    }

    // Check completed
    return this.completedJobs.get(jobId) || null;
  }

  /**
   * List all jobs
   */
  listJobs(options?: { status?: JobStatus; limit?: number }): LocalComputeJob[] {
    const jobs: LocalComputeJob[] = [];

    // Add current job
    if (this.currentJob) {
      jobs.push({ ...this.currentJob.job, logs: this.jobLogs.get(this.currentJob.job.id) || [] });
    }

    // Add queued jobs
    jobs.push(...this.jobQueue.map((q) => q.job));

    // Add completed jobs
    jobs.push(...Array.from(this.completedJobs.values()));

    // Filter by status
    let filtered = options?.status
      ? jobs.filter((j) => j.status === options.status)
      : jobs;

    // Sort by submission time (newest first)
    filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    // Limit results
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Check if it's the current job
    if (this.currentJob?.job.id === jobId) {
      try {
        process.kill(this.currentJob.pid, 'SIGTERM');

        // Wait for process to exit
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            try {
              process.kill(this.currentJob!.pid, 0);
            } catch {
              clearInterval(check);
              resolve();
            }
          }, 100);

          // Force kill after 5 seconds
          setTimeout(() => {
            try {
              process.kill(this.currentJob!.pid, 'SIGKILL');
            } catch {
              // Already dead
            }
          }, 5000);
        });

        this.currentJob.job.status = 'cancelled';
        this.completedJobs.set(jobId, this.currentJob.job);
        this.currentJob = null;

        this.emit('job:cancelled', { jobId });
        return true;
      } catch {
        return false;
      }
    }

    // Check queue
    const queueIndex = this.jobQueue.findIndex((q) => q.job.id === jobId);
    if (queueIndex >= 0) {
      const removed = this.jobQueue.splice(queueIndex, 1)[0];
      if (removed) {
        removed.job.status = 'cancelled';
        this.completedJobs.set(jobId, removed.job);
        this.emit('job:cancelled', { jobId });
      }
      return true;
    }

    return false;
  }

  /**
   * Get job logs
   */
  getJobLogs(jobId: string, tail?: number): string[] {
    const logs = this.jobLogs.get(jobId) || [];
    if (tail && tail > 0) {
      return logs.slice(-tail);
    }
    return logs;
  }

  /**
   * Get agent status for local CLI display
   */
  async getStatus(): Promise<LocalAgentStatus> {
    // Check if agent is running by reading PID file
    let pid: number | undefined;
    let uptime: string | undefined;
    let isRunning = false;

    try {
      const pidStr = await fs.readFile(AGENT_PID_FILE, 'utf-8');
      pid = parseInt(pidStr.trim(), 10);
      // Check if process is still running
      process.kill(pid, 0);
      isRunning = true;

      if (this.startTime) {
        const uptimeMs = Date.now() - this.startTime.getTime();
        const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        uptime = `${hours}h ${minutes}m`;
      }
    } catch {
      isRunning = false;
    }

    const status: LocalAgentStatus = {
      running: isRunning || this.running,
      jobsCompleted: this.jobsCompleted,
      jobsRunning: this.currentJob ? 1 : 0,
    };
    if (pid !== undefined) status.pid = pid;
    if (uptime !== undefined) status.uptime = uptime;
    return status;
  }

  /**
   * Get full agent status for HPC Gateway
   */
  getFullStatus(): ComputeAgentStatus {
    return {
      id: this.agentId || '',
      name: this.config.name,
      status: this.currentJob ? 'busy' : 'idle',
      registeredAt: this.startTime || new Date(),
      lastHeartbeat: new Date(),
      currentJob: this.currentJob?.job || null,
      jobsCompleted: this.jobsCompleted,
      jobsFailed: this.jobsFailed,
      totalComputeTime: this.totalComputeTime,
      hardware: this.hardware!,
    };
  }

  /**
   * Start agent as a background daemon
   */
  async startDaemon(): Promise<void> {
    // Fork the process to run in background
    const { fork } = await import('child_process');
    const scriptPath = new URL(import.meta.url).pathname;

    const child = fork(scriptPath, ['--daemon-mode'], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    // Write PID file
    await fs.mkdir(NEXUS_DIR, { recursive: true });
    await fs.writeFile(AGENT_PID_FILE, child.pid?.toString() || '');
  }

  /**
   * Check if another agent is already running
   */
  private async isAnotherAgentRunning(): Promise<boolean> {
    try {
      const pidStr = await fs.readFile(AGENT_PID_FILE, 'utf-8');
      const pid = parseInt(pidStr.trim(), 10);

      if (pid === process.pid) {
        return false;
      }

      // Check if process is running
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        // Process not running, stale PID file
        await fs.unlink(AGENT_PID_FILE).catch(() => {});
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Start local API server
   */
  private async startLocalServer(): Promise<void> {
    this.localApp = express();
    this.localApp.use(express.json());

    // Health check
    this.localApp.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', agentId: this.agentId });
    });

    // Status
    this.localApp.get('/status', (_req: Request, res: Response) => {
      res.json(this.getFullStatus());
    });

    // Submit job
    this.localApp.post('/jobs', async (req: Request, res: Response) => {
      try {
        const job = await this.submitJob(req.body);
        res.json(job);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // List jobs
    this.localApp.get('/jobs', (req: Request, res: Response) => {
      const listParams: { status?: JobStatus; limit?: number } = {};
      const statusParam = req.query.status as string | undefined;
      if (statusParam && ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(statusParam)) {
        listParams.status = statusParam as JobStatus;
      }
      if (req.query.limit) {
        listParams.limit = parseInt(req.query.limit as string, 10);
      }
      const jobs = this.listJobs(listParams);
      res.json({ jobs });
    });

    // Get job
    this.localApp.get('/jobs/:jobId', (req: Request, res: Response) => {
      const jobId = req.params['jobId'];
      if (!jobId) {
        res.status(400).json({ error: 'Job ID required' });
        return;
      }
      const job = this.getJob(jobId);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    });

    // Get job logs
    this.localApp.get('/jobs/:jobId/logs', (req: Request, res: Response) => {
      const jobId = req.params['jobId'];
      if (!jobId) {
        res.status(400).json({ error: 'Job ID required' });
        return;
      }
      const logs = this.getJobLogs(
        jobId,
        req.query.tail ? parseInt(req.query.tail as string, 10) : undefined
      );
      res.json({ logs });
    });

    // Cancel job
    this.localApp.post('/jobs/:jobId/cancel', async (req: Request, res: Response) => {
      const jobId = req.params['jobId'];
      if (!jobId) {
        res.status(400).json({ error: 'Job ID required' });
        return;
      }
      const success = await this.cancelJob(jobId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Job not found or already completed' });
      }
    });

    // Shutdown
    this.localApp.post('/shutdown', async (_req: Request, res: Response) => {
      res.json({ success: true });
      setTimeout(() => this.stop(), 100);
    });

    // ========================================
    // Jupyter Kernel Endpoints
    // ========================================

    // Create kernel
    this.localApp.post('/kernels', async (req: Request, res: Response) => {
      try {
        const { language = 'python' } = req.body;
        const kernel = await this.createKernel(language);
        res.json(kernel);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // List kernels
    this.localApp.get('/kernels', (_req: Request, res: Response) => {
      const kernels = this.listKernels();
      res.json({ kernels });
    });

    // Get kernel
    this.localApp.get('/kernels/:kernelId', (req: Request, res: Response) => {
      const kernelId = req.params['kernelId'];
      if (!kernelId) {
        res.status(400).json({ error: 'Kernel ID required' });
        return;
      }
      const kernel = this.getKernelSession(kernelId);
      if (kernel) {
        res.json(kernel);
      } else {
        res.status(404).json({ error: 'Kernel not found' });
      }
    });

    // Execute code
    this.localApp.post('/kernels/:kernelId/execute', async (req: Request, res: Response) => {
      try {
        const kernelId = req.params['kernelId'];
        if (!kernelId) {
          res.status(400).json({ error: 'Kernel ID required' });
          return;
        }
        const result = await this.executeCode({
          ...req.body,
          kernelId,
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Execute code (auto-create kernel if needed)
    this.localApp.post('/execute', async (req: Request, res: Response) => {
      try {
        const result = await this.executeCode(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Shutdown kernel
    this.localApp.delete('/kernels/:kernelId', async (req: Request, res: Response) => {
      try {
        const kernelId = req.params['kernelId'];
        if (!kernelId) {
          res.status(400).json({ error: 'Kernel ID required' });
          return;
        }
        await this.shutdownKernel(kernelId);
        res.json({ success: true });
      } catch (error) {
        res.status(404).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Interrupt kernel execution
    this.localApp.post('/kernels/:kernelId/interrupt', async (req: Request, res: Response) => {
      try {
        const kernelId = req.params['kernelId'];
        if (!kernelId) {
          res.status(400).json({ error: 'Kernel ID required' });
          return;
        }
        const success = this.interruptKernel(kernelId);
        if (success) {
          res.json({ success: true });
        } else {
          res.status(404).json({ error: 'Kernel not found or not running' });
        }
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Start server
    return new Promise((resolve, reject) => {
      this.localServer = this.localApp!.listen(this.config.apiPort, () => {
        // Setup Socket.IO for log streaming
        this.localIO = new SocketIOServer(this.localServer!);

        this.localIO.on('connection', (socket) => {
          // Job log subscriptions
          socket.on('subscribe:logs', ({ jobId }) => {
            socket.join(`logs:${jobId}`);
          });

          // Kernel output subscriptions
          socket.on('subscribe:kernel', ({ kernelId }) => {
            socket.join(`kernel:${kernelId}`);
          });

          socket.on('unsubscribe:kernel', ({ kernelId }) => {
            socket.leave(`kernel:${kernelId}`);
          });
        });

        console.log(`Local compute agent listening on port ${this.config.apiPort}`);
        resolve();
      });

      this.localServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.apiPort} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Load authentication credentials from storage
   */
  private async loadCredentials(): Promise<void> {
    try {
      const credentials = await this.credentialsManager.loadCredentials();
      if (credentials && !this.credentialsManager.isExpired(credentials)) {
        this.accessToken = credentials.access_token;
        this.userId = credentials.user_id;
      }
    } catch (error) {
      // Non-fatal - agent can run in standalone mode without auth
    }
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.userId) {
      headers['X-User-ID'] = this.userId;
    }

    return headers;
  }

  /**
   * Connect to HPC Gateway via REST API
   */
  private async connectToGateway(): Promise<void> {
    if (!this.hardware) {
      throw new Error('Hardware not detected');
    }

    // Build registration payload
    const capabilities: AgentRegistration['capabilities'] = {
      gpuType: this.hardware.gpu?.type || 'none',
      gpuMemory: this.hardware.gpu?.memory || 0,
      cpuCores: this.hardware.cpu.cores,
      ramTotal: this.hardware.memory.total,
      frameworks: this.hardware.frameworks
        .filter((f) => f.available)
        .map((f) => f.name.toLowerCase()),
    };
    if (this.hardware.gpu?.api === 'Metal 3') capabilities.metalVersion = 3;
    if (this.hardware.gpu?.computeCapability) capabilities.computeCapability = this.hardware.gpu.computeCapability;
    if (this.hardware.gpu?.neuralEngine !== undefined) capabilities.neuralEngine = this.hardware.gpu.neuralEngine;
    if (this.hardware.gpu?.neuralEngineTops !== undefined) capabilities.neuralEngineTops = this.hardware.gpu.neuralEngineTops;

    const registration: AgentRegistration = {
      type: 'local-compute',
      name: this.config.name,
      hostname: os.hostname(),
      capabilities,
      config: {
        maxMemoryPercent: this.config.maxMemoryPercent,
        allowRemoteJobs: this.config.allowRemoteJobs,
        idleTimeoutMinutes: this.config.idleTimeoutMinutes,
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.config.gatewayUrl}/api/local-compute/register`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(registration),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json() as { agentId: string; heartbeatInterval?: number };
        this.agentId = data.agentId;
        this.gatewayConnected = true;
        this.reconnectAttempts = 0;
        console.log('Connected to HPC Gateway');
        console.log(`  Agent ID: ${this.agentId}`);
      } else {
        const error = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        console.log(`Gateway registration failed: ${error.error || response.statusText} - running in standalone mode`);
        this.emit('error', {
          code: 'REGISTRATION_FAILED',
          message: error.error || response.statusText,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('abort')) {
        console.log('Gateway connection timeout - running in standalone mode');
      } else {
        console.log(`Gateway connection failed: ${message} - running in standalone mode`);
      }
      this.emit('error', {
        code: 'CONNECTION_ERROR',
        message,
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.running) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('error', {
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: 'Maximum reconnection attempts reached',
      });
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      60000
    );

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connectToGateway();
      } catch {
        // Error handled in connect, schedule next attempt
        if (this.running && !this.gatewayConnected) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat to gateway via REST API
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.gatewayConnected && this.agentId) {
        try {
          const response = await fetch(`${this.config.gatewayUrl}/api/local-compute/heartbeat`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              agentId: this.agentId,
              status: this.currentJob ? 'busy' : 'idle',
              currentJob: this.currentJob ? {
                id: this.currentJob.job.id,
                name: this.currentJob.job.name,
              } : null,
            }),
          });

          if (response.ok) {
            this.emit('heartbeat', { timestamp: new Date() });
          } else if (response.status === 404) {
            // Agent was removed from gateway, try to re-register
            console.log('Agent not found on gateway, re-registering...');
            this.gatewayConnected = false;
            this.scheduleReconnect();
          }
        } catch (error) {
          // Heartbeat failed, will retry on next interval
          const message = error instanceof Error ? error.message : String(error);
          if (this.running) {
            console.log(`Heartbeat failed: ${message}`);
          }
        }
      }
    }, 15000); // Send heartbeat every 15 seconds
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.config.idleTimeoutMinutes > 0 && !this.currentJob && this.jobQueue.length === 0) {
      this.idleTimer = setTimeout(() => {
        console.log('Idle timeout reached, shutting down...');
        this.stop();
      }, this.config.idleTimeoutMinutes * 60 * 1000);
    }
  }

  /**
   * Process job queue
   */
  private async processQueue(): Promise<void> {
    if (this.currentJob || this.jobQueue.length === 0) {
      this.resetIdleTimer();
      return;
    }

    // Get highest priority job
    this.jobQueue.sort((a, b) => b.priority - a.priority);
    const queuedJob = this.jobQueue.shift();

    if (!queuedJob) {
      this.resetIdleTimer();
      return;
    }

    await this.executeJob(queuedJob.job);
  }

  /**
   * Execute a job
   */
  private async executeJob(job: LocalComputeJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    this.emit('job:started', { jobId: job.id });

    // Build environment (filter out undefined values)
    const env: Record<string, string> = Object.fromEntries(
      Object.entries({ ...process.env, ...job.environment })
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
    );

    // Set framework-specific environment
    if (this.hardware?.gpu?.type.includes('Apple M')) {
      env.PYTORCH_ENABLE_MPS_FALLBACK = '1';
    }

    // Determine command
    let command: string;
    let args: string[];

    if (job.scriptPath) {
      if (job.scriptPath.endsWith('.py')) {
        command = 'python3';
        args = [job.scriptPath];
      } else {
        command = 'bash';
        args = [job.scriptPath];
      }
    } else {
      command = 'python3';
      args = ['-c', job.script];
    }

    // Spawn process
    const childProcess = spawn(command, args, {
      cwd: job.workingDir,
      env: env as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.currentJob = {
      pid: childProcess.pid!,
      job,
      startTime: new Date(),
      logBuffer: [],
    };

    const logs = this.jobLogs.get(job.id) || [];

    // Capture stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      logs.push(line);
      this.currentJob!.logBuffer.push(line);

      this.emit('job:log', { jobId: job.id, line, timestamp: new Date() });

      // Broadcast to WebSocket clients
      if (this.localIO) {
        this.localIO.to(`logs:${job.id}`).emit('log', { line });
      }
    });

    // Capture stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const line = `[stderr] ${data.toString()}`;
      logs.push(line);
      this.currentJob!.logBuffer.push(line);

      this.emit('job:log', { jobId: job.id, line, timestamp: new Date() });

      if (this.localIO) {
        this.localIO.to(`logs:${job.id}`).emit('log', { line });
      }
    });

    // Handle completion
    return new Promise<void>((resolve) => {
      childProcess.on('exit', (code, signal) => {
        const endTime = new Date();
        const durationSeconds =
          (endTime.getTime() - this.currentJob!.startTime.getTime()) / 1000;

        job.completedAt = endTime;
        job.exitCode = code ?? (signal ? 128 : 1);
        job.logs = [...logs];

        const metrics: JobMetrics = {
          peakMemoryGb: 0, // Would need to track during execution
          cpuUtilization: 0,
          durationSeconds,
        };

        job.metrics = metrics;

        if (code === 0) {
          job.status = 'completed';
          this.jobsCompleted++;
          this.emit('job:completed', { jobId: job.id, exitCode: code, metrics });

          if (this.localIO) {
            this.localIO.to(`logs:${job.id}`).emit('job:completed', { exitCode: code });
          }
        } else {
          job.status = 'failed';
          job.error = signal
            ? `Process killed by signal: ${signal}`
            : `Process exited with code: ${code}`;
          this.jobsFailed++;
          this.emit('job:failed', { jobId: job.id, error: job.error });

          if (this.localIO) {
            this.localIO.to(`logs:${job.id}`).emit('job:failed', { error: job.error });
          }
        }

        this.totalComputeTime += durationSeconds;
        this.completedJobs.set(job.id, job);
        this.currentJob = null;

        // Report to gateway (fire and forget)
        if (this.gatewayConnected && this.agentId) {
          fetch(`${this.config.gatewayUrl}/api/local-compute/heartbeat`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              agentId: this.agentId,
              status: 'idle',
              currentJob: null,
            }),
          }).catch(() => {
            // Ignore heartbeat errors
          });
        }

        // Process next job
        this.processQueue();
        resolve();
      });

      childProcess.on('error', (error) => {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        this.jobsFailed++;

        this.emit('job:failed', { jobId: job.id, error: error.message });
        this.completedJobs.set(job.id, job);
        this.currentJob = null;

        this.processQueue();
        resolve();
      });
    });
  }

  // ========================================
  // Kernel Management Methods
  // ========================================

  /**
   * Create a new kernel session
   */
  async createKernel(language: 'python' | 'r' = 'python'): Promise<KernelSession> {
    const kernelId = uuidv4();

    const session: KernelSession = {
      id: kernelId,
      language,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'starting',
      executionCount: 0,
    };

    this.kernelSessions.set(kernelId, session);
    this.kernelOutputBuffers.set(kernelId, []);

    // For Python, we use a persistent Python subprocess
    // that can execute multiple code blocks
    const pythonProcess = spawn('python3', ['-u', '-i', '-q'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        // Enable Apple MPS if available
        PYTORCH_ENABLE_MPS_FALLBACK: '1',
      },
    });

    this.kernelProcesses.set(kernelId, pythonProcess);

    // Initialize the Python environment
    const initCode = `
import sys
import json
import traceback

# Set up output capture
class OutputCapture:
    def __init__(self, stream_type):
        self.stream_type = stream_type
        self.original = getattr(sys, stream_type)

    def write(self, text):
        self.original.write(text)
        self.original.flush()

    def flush(self):
        self.original.flush()

sys.stdout = OutputCapture('stdout')
sys.stderr = OutputCapture('stderr')

# Import common ML libraries if available
try:
    import numpy as np
except ImportError:
    pass
try:
    import torch
    if torch.backends.mps.is_available():
        print("MPS (Apple Silicon GPU) is available")
except ImportError:
    pass
try:
    import mlx
    print("MLX (Apple ML framework) is available")
except ImportError:
    pass

print("__KERNEL_READY__")
`;

    pythonProcess.stdin?.write(initCode);
    pythonProcess.stdin?.write('\n');

    // Wait for kernel to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Kernel startup timeout'));
      }, 30000);

      const checkReady = (data: Buffer) => {
        if (data.toString().includes('__KERNEL_READY__')) {
          clearTimeout(timeout);
          pythonProcess.stdout?.off('data', checkReady);
          session.status = 'idle';
          this.kernelSessions.set(kernelId, session);
          resolve();
        }
      };

      pythonProcess.stdout?.on('data', checkReady);

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Broadcast via WebSocket
    if (this.localIO) {
      this.localIO.emit('kernel:created', { kernelId, session });
    }

    return session;
  }

  /**
   * Execute code in a kernel
   */
  async executeCode(request: ExecuteRequest): Promise<ExecuteResult> {
    const startTime = Date.now();
    let kernelId = request.kernelId;

    // Auto-create kernel if not specified
    if (!kernelId || !this.kernelSessions.has(kernelId)) {
      const session = await this.createKernel('python');
      kernelId = session.id;
    }

    const session = this.kernelSessions.get(kernelId);
    const proc = this.kernelProcesses.get(kernelId);

    if (!session || !proc) {
      throw new Error('Kernel not found');
    }

    // Update session status
    session.status = 'busy';
    session.lastActivity = new Date();
    this.kernelSessions.set(kernelId, session);

    if (this.localIO) {
      this.localIO.emit('kernel:status', { kernelId, status: 'busy' });
    }

    const outputs: ExecutionOutput[] = [];
    let errorResult: ExecuteResult['error'] | undefined;

    // Generate execution marker
    const execId = uuidv4().slice(0, 8);
    const startMarker = `__EXEC_START_${execId}__`;
    const endMarker = `__EXEC_END_${execId}__`;
    const errorMarker = `__EXEC_ERROR_${execId}__`;

    // Wrap code to capture output and detect completion
    const wrappedCode = `
print("${startMarker}")
try:
    exec(${JSON.stringify(request.code)})
    print("${endMarker}")
except Exception as e:
    import traceback
    print("${errorMarker}")
    print(json.dumps({
        "name": type(e).__name__,
        "value": str(e),
        "traceback": traceback.format_exc().split("\\n")
    }))
    print("${endMarker}")
`;

    return new Promise((resolve) => {
      let outputBuffer = '';
      let inExecution = false;
      let gotError = false;

      const handleOutput = (data: Buffer, isStderr: boolean) => {
        const text = data.toString();
        outputBuffer += text;

        // Check for start marker
        if (outputBuffer.includes(startMarker)) {
          inExecution = true;
          outputBuffer = outputBuffer.split(startMarker)[1] ?? '';
        }

        // Check for error marker
        if (outputBuffer.includes(errorMarker)) {
          gotError = true;
          const parts = outputBuffer.split(errorMarker);
          outputBuffer = parts[1] ?? '';
        }

        // Check for end marker
        if (inExecution && outputBuffer.includes(endMarker)) {
          const outputText = outputBuffer.split(endMarker)[0] ?? '';

          // Parse error if present
          if (gotError) {
            try {
              const errorData = JSON.parse(outputText.trim());
              errorResult = {
                name: String(errorData.name ?? 'Error'),
                value: String(errorData.value ?? outputText),
                traceback: Array.isArray(errorData.traceback) ? errorData.traceback : [],
              };
            } catch {
              errorResult = {
                name: 'ExecutionError',
                value: outputText,
                traceback: [],
              };
            }
          } else if (outputText.trim()) {
            const streamOutput: ExecutionOutput = {
              type: 'stream',
              name: isStderr ? 'stderr' : 'stdout',
            };
            streamOutput.text = outputText;
            outputs.push(streamOutput);

            // Broadcast output
            if (this.localIO) {
              this.localIO.emit('kernel:output', {
                kernelId,
                output: outputs[outputs.length - 1],
              });
            }
          }

          // Cleanup listeners
          proc.stdout?.off('data', stdoutHandler);
          proc.stderr?.off('data', stderrHandler);

          // Update session
          session.status = 'idle';
          session.executionCount++;
          session.lastActivity = new Date();
          this.kernelSessions.set(kernelId, session);

          const result: ExecuteResult = {
            executionCount: session.executionCount,
            status: errorResult ? 'error' : 'ok',
            outputs,
            duration: Date.now() - startTime,
          };
          if (errorResult) result.error = errorResult;

          if (this.localIO) {
            this.localIO.emit('kernel:status', { kernelId, status: 'idle' });
            this.localIO.emit('kernel:result', { kernelId, result });
          }

          resolve(result);
        } else if (inExecution && !gotError) {
          // Stream intermediate output
          const output: ExecutionOutput = {
            type: 'stream',
            name: isStderr ? 'stderr' : 'stdout',
          };
          output.text = text;
          outputs.push(output);

          if (this.localIO) {
            this.localIO.emit('kernel:output', { kernelId, output });
          }
        }
      };

      const stdoutHandler = (data: Buffer) => handleOutput(data, false);
      const stderrHandler = (data: Buffer) => handleOutput(data, true);

      proc.stdout?.on('data', stdoutHandler);
      proc.stderr?.on('data', stderrHandler);

      // Send code to kernel
      proc.stdin?.write(wrappedCode);
      proc.stdin?.write('\n');

      // Timeout after 5 minutes
      setTimeout(() => {
        proc.stdout?.off('data', stdoutHandler);
        proc.stderr?.off('data', stderrHandler);

        session.status = 'idle';
        this.kernelSessions.set(kernelId!, session);

        resolve({
          executionCount: session.executionCount,
          status: 'error',
          outputs,
          error: {
            name: 'TimeoutError',
            value: 'Execution timed out after 5 minutes',
            traceback: [],
          },
          duration: Date.now() - startTime,
        });
      }, 300000);
    });
  }

  /**
   * Shutdown a kernel
   */
  async shutdownKernel(kernelId: string): Promise<void> {
    const session = this.kernelSessions.get(kernelId);
    const proc = this.kernelProcesses.get(kernelId);

    if (!session || !proc) {
      throw new Error('Kernel not found');
    }

    // Send quit command
    proc.stdin?.write('quit()\n');

    // Wait for process to exit or force kill
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Cleanup
    this.kernelSessions.delete(kernelId);
    this.kernelProcesses.delete(kernelId);
    this.kernelOutputBuffers.delete(kernelId);

    if (this.localIO) {
      this.localIO.emit('kernel:shutdown', { kernelId });
    }
  }

  /**
   * Get kernel session info
   */
  getKernelSession(kernelId: string): KernelSession | null {
    return this.kernelSessions.get(kernelId) || null;
  }

  /**
   * List all active kernels
   */
  listKernels(): KernelSession[] {
    return Array.from(this.kernelSessions.values());
  }

  /**
   * Interrupt kernel execution
   */
  interruptKernel(kernelId: string): boolean {
    const proc = this.kernelProcesses.get(kernelId);
    if (!proc) {
      return false;
    }

    try {
      proc.kill('SIGINT');

      const session = this.kernelSessions.get(kernelId);
      if (session) {
        session.status = 'idle';
        this.kernelSessions.set(kernelId, session);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown all kernels (called on agent stop)
   */
  private async shutdownAllKernels(): Promise<void> {
    const kernelIds = Array.from(this.kernelSessions.keys());
    await Promise.all(
      kernelIds.map((id) => this.shutdownKernel(id).catch(() => {}))
    );
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      console.log('\nShutting down compute agent...');
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export default LocalComputeAgent;
