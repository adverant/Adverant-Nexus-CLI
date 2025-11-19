# Transport Layer

Production-ready transport implementations for HTTP, WebSocket, and MCP communication.

## Overview

The transport layer provides robust, enterprise-grade clients for:
- **HTTP/REST** - Axios-based client with retry logic and interceptors
- **WebSocket** - Real-time bidirectional communication with auto-reconnection
- **MCP** - Model Context Protocol for local tool integration
- **Streaming** - SSE and JSON stream processing

## Features

### HTTP Client (`http-client.ts`)

Production-ready HTTP client built on Axios with:

- ✅ Automatic token refresh on 401 responses
- ✅ Retry logic with exponential backoff
- ✅ Request/response interceptors
- ✅ Attribution headers (X-Organization-ID, X-App-ID, X-End-User-ID)
- ✅ Request metrics tracking
- ✅ Comprehensive error handling
- ✅ Cancellation support via AbortController

**Usage:**

```typescript
import { createHTTPClient } from './transport';

const client = createHTTPClient({
  baseUrl: 'https://api.nexus.dev',
  timeout: 30000,
  retries: 3,
  auth: {
    type: 'bearer',
    credentials: 'your-token',
  },
});

// Set attribution headers
client.setAttributionHeaders({
  organizationId: 'org_123',
  appId: 'app_456',
  endUserId: 'user_789',
});

// Set token refresh callback
client.setTokenRefreshCallback(async () => {
  return await refreshToken();
});

// Make requests
const data = await client.get('/api/resource');
const result = await client.post('/api/action', { payload: 'data' });
```

**Configuration:**

```typescript
interface TransportConfig {
  baseUrl: string;
  timeout?: number;        // Default: 30000ms
  retries?: number;        // Default: 3
  headers?: Record<string, string>;
  auth?: {
    type: 'api-key' | 'bearer' | 'basic' | 'oauth';
    credentials: string | { username: string; password: string };
  };
}
```

### WebSocket Client (`websocket-client.ts`)

Real-time WebSocket client using the `ws` library with:

- ✅ Auto-reconnection with exponential backoff
- ✅ Event-based message handling
- ✅ Heartbeat/ping-pong mechanism
- ✅ Binary and text message support
- ✅ Message buffering during disconnections
- ✅ Connection state management

**Usage:**

```typescript
import { WebSocketClient } from './transport';

const wsClient = new WebSocketClient();

// Connect to server
await wsClient.connect('wss://api.nexus.dev/ws', {
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  timeout: 30000,
});

// Listen for events
wsClient.on('connected', () => {
  console.log('Connected to server');
});

wsClient.on('message', (data) => {
  console.log('Received:', data);
});

wsClient.on('reconnecting', ({ attempt, delay }) => {
  console.log(`Reconnecting (attempt ${attempt}) in ${delay}ms...`);
});

// Send messages
wsClient.send('chat', { message: 'Hello, server!' });

// Send binary data
wsClient.sendBinary(Buffer.from('binary data'));

// Disconnect
await wsClient.disconnect();
```

**Events:**

- `connected` - Connection established
- `disconnected` - Connection closed
- `reconnecting` - Attempting to reconnect
- `error` - Error occurred
- `ping` - Ping received
- `pong` - Pong received
- `<custom>` - Any custom event from server

### MCP Client (`mcp-client.ts`)

Model Context Protocol client for local tool integration:

- ✅ Stdio transport for local MCP servers
- ✅ Tool discovery and invocation
- ✅ Prompt management
- ✅ Resource management
- ✅ Server capability detection
- ✅ Timeout support

**Usage:**

```typescript
import { MCPClient } from './transport';

const mcpClient = new MCPClient();

// Connect to MCP server
await mcpClient.connect({
  command: 'npx',
  args: ['-y', '@anthropic/mcp-server-filesystem', '/Users/user/workspace'],
  timeout: 10000,
});

// List available tools
const tools = await mcpClient.listTools();
console.log('Available tools:', tools);

// Execute a tool
const result = await mcpClient.executeTool('read_file', {
  path: '/path/to/file.txt',
});

// List and get prompts
const prompts = await mcpClient.listPrompts();
const prompt = await mcpClient.getPrompt('analyze-code', {
  language: 'typescript'
});

// List and read resources
const resources = await mcpClient.listResources();
const content = await mcpClient.readResource('file:///path/to/resource');

// Disconnect
await mcpClient.disconnect();
```

### Stream Handler (`stream-handler.ts`)

Unified streaming interface for SSE and WebSocket streams:

- ✅ SSE (Server-Sent Events) parsing
- ✅ JSON stream parsing (newline-delimited)
- ✅ Progress tracking
- ✅ Error recovery
- ✅ Cancellation support
- ✅ Stream utilities (filter, map, collect)

**Usage:**

```typescript
import { StreamHandler } from './transport';

const streamHandler = new StreamHandler(httpClient, wsClient);

// Stream via SSE (HTTP)
for await (const chunk of streamHandler.stream('/api/stream')) {
  switch (chunk.type) {
    case 'data':
      console.log('Data:', chunk.data);
      break;
    case 'progress':
      console.log('Progress:', chunk.data);
      break;
    case 'error':
      console.error('Error:', chunk.data);
      break;
    case 'complete':
      console.log('Stream complete');
      break;
  }
}

// Stream via WebSocket
for await (const chunk of streamHandler.stream('wss://api.nexus.dev/stream')) {
  console.log('Chunk:', chunk);
}

// With cancellation
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000); // Cancel after 5s

for await (const chunk of streamHandler.stream('/api/stream', {
  signal: controller.signal,
})) {
  console.log('Chunk:', chunk);
}
```

**Utilities:**

```typescript
import {
  parseStreamJSON,
  formatStreamJSON,
  collectStream,
  filterStream,
  mapStream
} from './transport';

// Parse newline-delimited JSON
const textStream = getTextStream();
for await (const obj of parseStreamJSON(textStream)) {
  console.log('Object:', obj);
}

// Format as stream JSON
const jsonLine = formatStreamJSON({ id: 1, name: 'test' });
// Output: {"id":1,"name":"test"}\n

// Collect all data chunks
const results = await collectStream(stream);

// Filter by chunk type
const dataOnly = filterStream(stream, ['data']);

// Map chunks
const mapped = mapStream(stream, chunk => ({
  ...chunk,
  data: processData(chunk.data),
}));
```

## Error Handling

All transport clients use a unified `TransportError` interface:

```typescript
interface TransportError extends Error {
  name: string;         // Error name
  code: string;         // Error code (e.g., 'HTTP_404', 'WS_ERROR')
  message: string;      // Human-readable message
  statusCode?: number;  // HTTP status code (if applicable)
  details?: any;        // Additional error details
  retryable?: boolean;  // Whether the operation can be retried
}
```

**Example:**

```typescript
try {
  const data = await client.get('/api/resource');
} catch (error) {
  if (error.retryable) {
    console.log('Retrying...');
    // Retry logic
  } else {
    console.error(`Fatal error ${error.code}:`, error.message);
  }
}
```

## Integration with Auth

The transport layer integrates with the authentication system:

```typescript
import { createHTTPClient } from './transport';
import { AuthClient } from '../auth';

const authClient = new AuthClient(config);
const httpClient = createHTTPClient(config);

// Set token refresh callback
httpClient.setTokenRefreshCallback(async () => {
  const session = await authClient.refreshSession();
  return session.accessToken;
});

// The client will automatically refresh tokens on 401
const data = await httpClient.get('/api/protected-resource');
```

## Attribution Headers

Support for multi-tenant request attribution:

```typescript
client.setAttributionHeaders({
  organizationId: 'org_123',  // X-Organization-ID
  appId: 'app_456',           // X-App-ID
  endUserId: 'user_789',      // X-End-User-ID
});
```

These headers are automatically included in all requests for:
- Multi-tenant isolation
- Usage tracking
- Billing attribution
- Audit logging

## Metrics & Monitoring

The HTTP client tracks request metrics:

```typescript
// Get metrics for a specific request
const metrics = client.getMetrics('req_123');

// Get all metrics
const allMetrics = client.getMetrics();

// Clear metrics
client.clearMetrics();
```

**Metrics include:**
- `startTime` - Request start timestamp
- `endTime` - Request end timestamp
- `duration` - Request duration in ms
- `retries` - Number of retry attempts
- `success` - Whether request succeeded
- `error` - Error details (if failed)

## Best Practices

1. **Reuse clients** - Create once, reuse across application
2. **Set timeouts** - Always configure appropriate timeouts
3. **Handle errors** - Check `retryable` flag before retrying
4. **Use cancellation** - Pass AbortController signals for long operations
5. **Clean up** - Disconnect WebSocket and MCP clients when done
6. **Monitor metrics** - Track request performance

## Architecture

```
transport/
├── index.ts              # Exports
├── http-client.ts        # HTTP/REST client (384 lines)
├── websocket-client.ts   # WebSocket client (421 lines)
├── mcp-client.ts         # MCP client (470 lines)
├── stream-handler.ts     # Stream processing (534 lines)
└── README.md            # This file
```

**Total:** 1,835 lines of production-ready transport code

## Dependencies

```json
{
  "axios": "^1.6.0",
  "ws": "^8.14.0",
  "eventemitter3": "^5.0.0",
  "@modelcontextprotocol/sdk": "^0.5.0"
}
```

## Testing

```bash
# Run transport tests
npm test -- transport

# Test HTTP client
npm test -- transport/http-client

# Test WebSocket client
npm test -- transport/websocket-client

# Test MCP client
npm test -- transport/mcp-client

# Test stream handler
npm test -- transport/stream-handler
```

## Future Enhancements

- [ ] GraphQL transport support
- [ ] gRPC transport support
- [ ] HTTP/2 and HTTP/3 support
- [ ] Request/response compression
- [ ] Connection pooling optimization
- [ ] Advanced metrics (histograms, percentiles)
- [ ] Circuit breaker pattern
- [ ] Rate limiting
- [ ] Request deduplication
- [ ] Offline queue support
