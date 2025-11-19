/**
 * Session Zod Schemas
 *
 * Runtime validation schemas for session types.
 * TypeScript types are inferred from these schemas to ensure
 * runtime validation matches compile-time types.
 */

import { z } from 'zod';

/**
 * Session context schema
 */
export const SessionContextSchema = z.object({
  workspace: z.any().optional(),
  cwd: z.string(),
  config: z.any(),
  environment: z.record(z.string()),
  services: z.record(z.any()),
});

/**
 * History entry schema
 */
export const HistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  command: z.string(),
  args: z.any(),
  namespace: z.string().optional(),
  success: z.boolean(),
  duration: z.number(),
});

/**
 * Session result schema
 */
export const SessionResultSchema = z.object({
  historyId: z.string(),
  timestamp: z.date(),
  result: z.any(),
  output: z.string().optional(),
});

/**
 * Session metadata schema
 */
export const SessionMetadataSchema = z.object({
  totalCommands: z.number(),
  successfulCommands: z.number(),
  failedCommands: z.number(),
  totalDuration: z.number(),
  lastCommand: z.string().optional(),
  tags: z.array(z.string()),
});

/**
 * Session schema
 */
export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.date(),
  updated: z.date(),
  context: SessionContextSchema,
  history: z.array(HistoryEntrySchema),
  results: z.array(SessionResultSchema),
  mcpMemories: z.array(z.string()),
  metadata: SessionMetadataSchema,
});

/**
 * Session summary schema
 */
export const SessionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.date(),
  updated: z.date(),
  commandCount: z.number(),
  tags: z.array(z.string()),
});

/**
 * Inferred TypeScript types from Zod schemas
 * These can replace manual interface definitions
 */
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type SessionResult = z.infer<typeof SessionResultSchema>;
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
