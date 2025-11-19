/**
 * WebSocket Transport Client
 *
 * Production-ready WebSocket client with:
 * - Auto-reconnection with exponential backoff
 * - Event-based message handling
 * - Heartbeat/ping-pong support
 * - Binary and text message support
 * - Message buffering during disconnections
 * - Connection state management
 */

import WebSocket from 'ws';
import EventEmitter from 'eventemitter3';
import type {
  WebSocketTransport,
  WSOptions,
  WSEventHandler,
  TransportError,
} from '@nexus-cli/types';

interface BufferedMessage {
  event: string;
  data: any;
  timestamp: number;
}

export class WebSocketClient implements WebSocketTransport {
  private ws: WebSocket | null = null;
  private emitter: EventEmitter;
  private url: string = '';
  private options: WSOptions;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageBuffer: BufferedMessage[] = [];
  private connected: boolean = false;
  private intentionalDisconnect: boolean = false;

  constructor() {
    this.emitter = new EventEmitter();
    this.options = {
      reconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      timeout: 30000,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(url: string, options?: WSOptions): Promise<void> {
    this.url = url;
    this.options = { ...this.options, ...options };
    this.intentionalDisconnect = false;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(url, {
          handshakeTimeout: this.options.timeout,
        });

        // Setup timeout for connection
        const timeout = setTimeout(() => {
          if (this.ws) {
            this.ws.terminate();
          }
          reject(this.createError('CONNECTION_TIMEOUT', 'Connection timeout'));
        }, this.options.timeout);

        // Connection opened
        this.ws.once('open', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          this.setupEventHandlers();
          this.startHeartbeat();
          this.flushMessageBuffer();
          this.emitter.emit('connected');
          resolve();
        });

        // Connection error
        this.ws.once('error', (error: Error) => {
          clearTimeout(timeout);
          reject(this.createError('CONNECTION_ERROR', error.message));
        });
      } catch (error) {
        reject(this.createError('CONNECTION_ERROR', (error as Error).message));
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.removeAllListeners();

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      } else {
        this.ws.terminate();
      }

      this.ws = null;
    }

    this.connected = false;
    this.messageBuffer = [];
    this.emitter.removeAllListeners();
  }

  /**
   * Send event to server
   */
  send(event: string, data: any): void {
    const message = JSON.stringify({ event, data });

    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) {
      // Buffer message if reconnection is enabled
      if (this.options.reconnect && !this.intentionalDisconnect) {
        this.messageBuffer.push({
          event,
          data,
          timestamp: Date.now(),
        });
      } else {
        throw this.createError('NOT_CONNECTED', 'WebSocket not connected');
      }
      return;
    }

    try {
      this.ws.send(message);
    } catch (error) {
      this.emitter.emit('error', this.createError(
        'SEND_ERROR',
        (error as Error).message
      ));

      // Buffer for retry
      if (this.options.reconnect) {
        this.messageBuffer.push({
          event,
          data,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Send binary data
   */
  sendBinary(data: Buffer | Uint8Array): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) {
      throw this.createError('NOT_CONNECTED', 'WebSocket not connected');
    }

    try {
      this.ws.send(data, { binary: true });
    } catch (error) {
      this.emitter.emit('error', this.createError(
        'SEND_ERROR',
        (error as Error).message
      ));
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: WSEventHandler): void {
    this.emitter.on(event, handler);
  }

  /**
   * Register one-time event handler
   */
  once(event: string, handler: WSEventHandler): void {
    this.emitter.once(event, handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler?: WSEventHandler): void {
    if (handler) {
      this.emitter.off(event, handler);
    } else {
      this.emitter.removeAllListeners(event);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Setup event handlers for WebSocket lifecycle
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    // Message received
    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
          // Binary message
          this.emitter.emit('binary', data);
        } else {
          // Text message
          const message = JSON.parse(data.toString());

          // Handle special events
          if (message.event === 'pong') {
            this.emitter.emit('pong', { latency: message.data?.latency });
            return;
          }

          // Emit the event
          this.emitter.emit(message.event, message.data);
        }
      } catch (error) {
        this.emitter.emit('error', this.createError(
          'PARSE_ERROR',
          `Failed to parse message: ${(error as Error).message}`
        ));
      }
    });

    // Connection closed
    this.ws.on('close', (code: number, reason: Buffer) => {
      this.connected = false;
      const reasonStr = reason.toString() || 'Unknown reason';

      this.emitter.emit('disconnected', {
        code,
        reason: reasonStr,
        intentional: this.intentionalDisconnect,
      });

      // Stop heartbeat
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      // Attempt reconnection if not intentional
      if (this.options.reconnect && !this.intentionalDisconnect) {
        this.attemptReconnect();
      }
    });

    // Connection error
    this.ws.on('error', (error: Error) => {
      this.emitter.emit('error', this.createError('WS_ERROR', error.message));
    });

    // Ping received
    this.ws.on('ping', () => {
      this.emitter.emit('ping');
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.pong();
      }
    });

    // Pong received
    this.ws.on('pong', () => {
      this.emitter.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    // Send ping every 30 seconds
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        this.ws.ping();

        // Also send JSON ping for application-level heartbeat
        this.send('ping', { timestamp: pingTime });
      }
    }, 30000);
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (
      this.options.maxReconnectAttempts &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.emitter.emit(
        'error',
        this.createError('MAX_RECONNECT_ATTEMPTS', 'Maximum reconnection attempts reached')
      );
      return;
    }

    // Clear existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      (this.options.reconnectDelay ?? 1000) * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectAttempts++;
    this.emitter.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.options.maxReconnectAttempts,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.url, this.options);
      } catch (error) {
        this.emitter.emit('error', this.createError(
          'RECONNECT_ERROR',
          (error as Error).message
        ));
      }
    }, delay);
  }

  /**
   * Flush buffered messages
   */
  private flushMessageBuffer(): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Remove messages older than 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.messageBuffer = this.messageBuffer.filter(
      msg => msg.timestamp > fiveMinutesAgo
    );

    // Send buffered messages
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      if (message) {
        try {
          this.send(message.event, message.data);
        } catch (error) {
          // If send fails, put message back and stop flushing
          this.messageBuffer.unshift(message);
          break;
        }
      }
    }
  }

  /**
   * Create transport error
   */
  private createError(code: string, message: string): TransportError {
    const error = new Error(message) as TransportError;
    error.name = 'WebSocketError';
    error.code = code;
    error.retryable = code !== 'MAX_RECONNECT_ATTEMPTS';
    return error;
  }

  /**
   * Get connection state for debugging
   */
  getState(): {
    connected: boolean;
    reconnectAttempts: number;
    bufferedMessages: number;
    readyState?: number;
    url: string;
  } {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      bufferedMessages: this.messageBuffer.length,
      readyState: this.ws?.readyState,
      url: this.url,
    };
  }

  /**
   * Get event emitter for advanced usage
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }
}
