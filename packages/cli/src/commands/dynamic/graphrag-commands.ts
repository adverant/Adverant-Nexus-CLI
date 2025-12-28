/**
 * GraphRAG Service Commands
 *
 * Commands for interacting with the GraphRAG service
 */

import type { Command, CommandHandler } from '@adverant-nexus/types';
import { HTTPClient } from '../../core/transport/http-client.js';

export const storeDocumentHandler: CommandHandler = async (args, context) => {
  const service = context.services.get('graphrag');
  if (!service) {
    return {
      success: false,
      error: new Error('GraphRAG service not found'),
    };
  }

  const client = new HTTPClient({ baseUrl: service.url || service.apiUrl });

  const file = args.file as string;
  const title = args.title as string | undefined;
  const type = args.type as string | undefined;
  const tags = args.tags as string[] | undefined;

  if (!file) {
    return {
      success: false,
      error: new Error('--file is required'),
    };
  }

  try {
    const response = await client.post('/documents', {
      file,
      title,
      metadata: {
        type: type || 'document',
        tags: tags || [],
      },
    });

    return {
      success: true,
      data: response,
      message: 'Document stored successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const queryHandler: CommandHandler = async (args, context) => {
  const service = context.services.get('graphrag');
  if (!service) {
    return {
      success: false,
      error: new Error('GraphRAG service not found'),
    };
  }

  const client = new HTTPClient({ baseUrl: service.url || service.apiUrl });

  const text = args.text as string;
  const limit = args.limit as number | undefined;

  if (!text) {
    return {
      success: false,
      error: new Error('--text query is required'),
    };
  }

  try {
    const response = await client.post('/query', {
      text,
      limit: limit || 10,
    });

    const count = response.results?.length || 0;
    return {
      success: true,
      data: response,
      message: `Found ${count} results`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const graphragCommands: Command[] = [
  {
    name: 'store-document',
    namespace: 'graphrag',
    description: 'Store a document in GraphRAG',
    handler: storeDocumentHandler,
    options: [
      {
        long: '--file',
        description: 'File path to store',
        type: 'file',
        required: true,
      },
      {
        long: '--title',
        description: 'Document title',
        type: 'string',
      },
      {
        long: '--type',
        description: 'Document type',
        type: 'string',
      },
      {
        long: '--tags',
        description: 'Document tags (comma-separated)',
        type: 'array',
      },
    ],
    examples: [
      'nexus graphrag store-document --file report.pdf --title "Q4 Report"',
    ],
    usage: 'nexus graphrag store-document --file <path> [--title <title>]',
    category: 'graphrag',
  },
  {
    name: 'query',
    namespace: 'graphrag',
    description: 'Query documents in GraphRAG',
    handler: queryHandler,
    options: [
      {
        long: '--text',
        description: 'Query text',
        type: 'string',
        required: true,
      },
      {
        long: '--limit',
        description: 'Number of results',
        type: 'number',
        default: 10,
      },
    ],
    examples: [
      'nexus graphrag query --text "user authentication"',
    ],
    usage: 'nexus graphrag query --text <query> [--limit N]',
    category: 'graphrag',
  },
];
