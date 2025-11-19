/**
 * Stream Handler
 *
 * Production-ready stream processing with:
 * - SSE (Server-Sent Events) parsing
 * - JSON stream parsing (newline-delimited)
 * - Progress tracking
 * - Error recovery
 * - Support for both HTTP and WebSocket streams
 * - Cancellation support via AbortController
 */

import type {
  StreamingTransport,
  StreamOptions,
  StreamChunk,
  TransportError,
} from '@nexus-cli/types';
import { HTTPClient } from './http-client.js';
import { WebSocketClient } from './websocket-client.js';

interface StreamEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export class StreamHandler implements StreamingTransport {
  private httpClient?: HTTPClient;
  private wsClient?: WebSocketClient;

  constructor(httpClient?: HTTPClient, wsClient?: WebSocketClient) {
    if (httpClient) this.httpClient = httpClient;
    if (wsClient) this.wsClient = wsClient;
  }

  /**
   * Stream data from endpoint
   * Automatically detects and handles HTTP (SSE) or WebSocket streams
   */
  async *stream<T = any>(
    path: string,
    options?: StreamOptions
  ): AsyncIterable<StreamChunk<T>> {
    // Determine transport type
    if (path.startsWith('ws://') || path.startsWith('wss://')) {
      yield* this.streamWebSocket<T>(path, options);
    } else {
      yield* this.streamHTTP<T>(path, options);
    }
  }

  /**
   * Stream via Server-Sent Events (HTTP)
   */
  private async *streamHTTP<T>(
    path: string,
    options?: StreamOptions
  ): AsyncIterable<StreamChunk<T>> {
    const method = options?.method || 'GET';

    // Build request configuration
    const requestInit: RequestInit = {
      method,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...options?.headers,
      },
      ...(options?.signal && { signal: options.signal }),
    };

    // Add body for POST requests
    if (method === 'POST' && options?.data) {
      requestInit.body = JSON.stringify(options.data);
      requestInit.headers = {
        ...requestInit.headers,
        'Content-Type': 'application/json',
      };
    }

    // Build URL with query parameters
    const url = this.buildUrl(path, options?.params);

    let response: Response;
    try {
      // Use HTTP client if available, otherwise use fetch
      if (this.httpClient) {
        const axiosInstance = this.httpClient.getAxiosInstance();
        const axiosResponse = await axiosInstance.request({
          url: path,
          method,
          headers: requestInit.headers as Record<string, string>,
          ...(options?.params && { params: options.params }),
          ...(options?.data && { data: options.data }),
          responseType: 'stream',
          ...(options?.signal && { signal: options.signal }),
        });

        // Convert axios stream to fetch-like response
        response = new Response(axiosResponse.data, {
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: new Headers(axiosResponse.headers as any),
        });
      } else {
        response = await fetch(url, requestInit);
      }
    } catch (error) {
      yield {
        type: 'error',
        data: this.createError('STREAM_ERROR', (error as Error).message) as any,
      };
      return;
    }

    // Check response status
    if (!response.ok) {
      yield {
        type: 'error',
        data: this.createError(
          'HTTP_ERROR',
          `HTTP ${response.status}: ${response.statusText}`
        ) as any,
        metadata: { statusCode: response.status },
      };
      return;
    }

    // Ensure response has body
    if (!response.body) {
      yield {
        type: 'error',
        data: this.createError('NO_BODY', 'Response has no body') as any,
      };
      return;
    }

    // Process stream
    yield* this.processSSEStream<T>(response.body);
  }

  /**
   * Process Server-Sent Events stream
   */
  private async *processSSEStream<T>(
    body: ReadableStream<Uint8Array>
  ): AsyncIterable<StreamChunk<T>> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: Partial<StreamEvent> = {};

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining event
          if (currentEvent.data) {
            yield this.parseSSEEvent<T>(currentEvent as StreamEvent);
          }

          yield { type: 'complete', data: null as any };
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Empty line indicates end of event
          if (!line.trim()) {
            if (currentEvent.data !== undefined) {
              yield this.parseSSEEvent<T>(currentEvent as StreamEvent);
              currentEvent = {};
            }
            continue;
          }

          // Parse SSE field
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) {
            continue;
          }

          const field = line.slice(0, colonIndex);
          const value = line.slice(colonIndex + 1).trim();

          switch (field) {
            case 'event':
              currentEvent.event = value;
              break;

            case 'data':
              currentEvent.data = currentEvent.data
                ? currentEvent.data + '\n' + value
                : value;
              break;

            case 'id':
              currentEvent.id = value;
              break;

            case 'retry':
              currentEvent.retry = parseInt(value, 10);
              break;
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        data: this.createError('STREAM_READ_ERROR', (error as Error).message) as any,
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse SSE event into StreamChunk
   */
  private parseSSEEvent<T>(event: StreamEvent): StreamChunk<T> {
    try {
      // Try to parse data as JSON
      const parsed = JSON.parse(event.data);

      // Check if parsed data has type field
      if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
        return {
          type: parsed.type,
          data: parsed.data,
          metadata: {
            ...parsed.metadata,
            eventId: event.id,
            eventType: event.event,
          },
        };
      }

      // Return as data chunk
      return {
        type: 'data',
        data: parsed,
        metadata: {
          eventId: event.id,
          eventType: event.event,
        },
      };
    } catch {
      // Not JSON, return as text
      return {
        type: 'data',
        data: event.data as any,
        metadata: {
          eventId: event.id,
          eventType: event.event,
        },
      };
    }
  }

  /**
   * Stream via WebSocket
   */
  private async *streamWebSocket<T>(
    _path: string,
    options?: StreamOptions
  ): AsyncIterable<StreamChunk<T>> {
    if (!this.wsClient) {
      yield {
        type: 'error',
        data: this.createError('NO_WS_CLIENT', 'WebSocket client not configured') as any,
      };
      return;
    }

    // Create queue for streaming chunks
    const queue: StreamChunk<T>[] = [];
    let completed = false;
    let error: TransportError | null = null;

    // Setup event handlers
    const dataHandler = (data: any) => {
      queue.push(this.parseStreamChunk<T>(data));
    };

    const errorHandler = (err: any) => {
      error = this.createError('WS_ERROR', err.message || 'WebSocket error');
      completed = true;
    };

    const completeHandler = () => {
      completed = true;
    };

    const disconnectHandler = () => {
      if (!completed) {
        error = this.createError('WS_DISCONNECTED', 'WebSocket disconnected unexpectedly');
        completed = true;
      }
    };

    this.wsClient.on('data', dataHandler);
    this.wsClient.on('error', errorHandler);
    this.wsClient.on('complete', completeHandler);
    this.wsClient.on('disconnected', disconnectHandler);

    // Handle cancellation
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        completed = true;
        error = this.createError('STREAM_CANCELLED', 'Stream cancelled by user');
      });
    }

    // Send initial request if data provided
    if (options?.data) {
      try {
        this.wsClient.send('stream', options.data);
      } catch (err) {
        yield {
          type: 'error',
          data: this.createError('WS_SEND_ERROR', (err as Error).message) as any,
        };
        return;
      }
    }

    // Yield chunks as they arrive
    try {
      while (!completed) {
        if (queue.length > 0) {
          const chunk = queue.shift()!;
          yield chunk;

          // Stop if we got a complete or error chunk
          if (chunk.type === 'complete' || chunk.type === 'error') {
            completed = true;
          }
        } else {
          // Wait before checking again
          await this.sleep(10);
        }
      }

      // Drain remaining queue
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      // Yield error if one occurred
      if (error) {
        yield { type: 'error', data: error as any };
      } else if (!queue.some(chunk => chunk.type === 'complete')) {
        yield { type: 'complete', data: null as any };
      }
    } finally {
      // Cleanup handlers
      this.wsClient.off('data', dataHandler);
      this.wsClient.off('error', errorHandler);
      this.wsClient.off('complete', completeHandler);
      this.wsClient.off('disconnected', disconnectHandler);
    }
  }

  /**
   * Parse stream chunk from raw data
   */
  private parseStreamChunk<T>(data: any): StreamChunk<T> {
    // Check if data has type field
    if (typeof data === 'object' && data !== null && 'type' in data) {
      return {
        type: data.type,
        data: data.data,
        metadata: data.metadata,
      };
    }

    // Default to data type
    return {
      type: 'data',
      data,
    };
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    if (!params) return path;

    // If path is already absolute, use it directly
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      // Relative path, need base URL
      url = new URL(path, 'http://localhost');
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Create transport error
   */
  private createError(code: string, message: string): TransportError {
    const error = new Error(message) as TransportError;
    error.name = 'StreamError';
    error.code = code;
    error.retryable = code === 'STREAM_ERROR' || code === 'WS_ERROR';
    return error;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Parse newline-delimited JSON stream
 *
 * Processes a stream of text chunks and extracts JSON objects
 * separated by newlines
 */
export async function* parseStreamJSON<T = any>(
  stream: AsyncIterable<string>
): AsyncIterable<T> {
  let buffer = '';

  for await (const chunk of stream) {
    buffer += chunk;

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        yield parsed as T;
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim());
      yield parsed as T;
    } catch {
      // Ignore final invalid JSON
    }
  }
}

/**
 * Format data as newline-delimited JSON
 *
 * Converts a data object into a JSON string with newline terminator
 */
export function formatStreamJSON(data: any): string {
  return JSON.stringify(data) + '\n';
}

/**
 * Collect all chunks from a stream into an array
 */
export async function collectStream<T>(
  stream: AsyncIterable<StreamChunk<T>>
): Promise<T[]> {
  const results: T[] = [];

  for await (const chunk of stream) {
    if (chunk.type === 'data') {
      results.push(chunk.data);
    } else if (chunk.type === 'error') {
      throw chunk.data;
    } else if (chunk.type === 'complete') {
      break;
    }
  }

  return results;
}

/**
 * Filter stream by chunk type
 */
export async function* filterStream<T>(
  stream: AsyncIterable<StreamChunk<T>>,
  types: Array<StreamChunk<T>['type']>
): AsyncIterable<StreamChunk<T>> {
  for await (const chunk of stream) {
    if (types.includes(chunk.type)) {
      yield chunk;
    }
  }
}

/**
 * Map stream chunks to new values
 */
export async function* mapStream<T, U>(
  stream: AsyncIterable<StreamChunk<T>>,
  mapper: (chunk: StreamChunk<T>) => StreamChunk<U> | Promise<StreamChunk<U>>
): AsyncIterable<StreamChunk<U>> {
  for await (const chunk of stream) {
    yield await mapper(chunk);
  }
}
