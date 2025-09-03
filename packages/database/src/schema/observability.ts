import { pgTable, text, timestamp, uuid, json, real, integer, boolean } from 'drizzle-orm/pg-core';
import { speeches } from './speeches';
import { users } from './auth';
import { modelProvider } from './types';

// Model runs for tracking AI usage and performance
export const modelRuns = pgTable('model_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  speechId: uuid('speech_id').references(() => speeches.id, { onDelete: 'set null' }),
  provider: text('provider', { enum: modelProvider }).notNull(),
  model: text('model').notNull(),
  stage: text('stage').notNull(), // outline, draft, humanize_passA, etc.
  promptTemplate: text('prompt_template'),
  promptVersion: text('prompt_version'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  cost: real('cost'), // Cost in USD
  latencyMs: integer('latency_ms'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  metadata: json('metadata'), // Additional run metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Model performance metrics
export const modelMetrics = pgTable('model_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelRunId: uuid('model_run_id').notNull().references(() => modelRuns.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  value: real('value').notNull(),
  unit: text('unit'), // tokens, seconds, percentage, etc.
  threshold: real('threshold'), // Expected/target value
  status: text('status').notNull(), // pass, fail, warning
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User telemetry for product analytics
export const telemetryEvents = pgTable('telemetry_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  eventName: text('event_name').notNull(),
  properties: json('properties'), // Event-specific properties
  context: json('context'), // User agent, IP (hashed), etc.
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Speech analytics - track speech creation metrics
export const speechAnalytics = pgTable('speech_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  draftCreatedAt: timestamp('draft_created_at'),
  firstEditAt: timestamp('first_edit_at'),
  finalizedAt: timestamp('finalized_at'),
  timeToFirstDraft: integer('time_to_first_draft'), // Seconds
  timeToFinal: integer('time_to_final'), // Total time to completion
  editBurden: integer('edit_burden'), // Number of edits made
  humanizationPasses: integer('humanization_passes'),
  finalWordCount: integer('final_word_count'),
  targetWordCount: integer('target_word_count'),
  accuracyScore: real('accuracy_score'), // How close to target duration
  qualityScore: real('quality_score'), // Overall quality metrics
  userSatisfaction: integer('user_satisfaction'), // 1-5 rating
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});