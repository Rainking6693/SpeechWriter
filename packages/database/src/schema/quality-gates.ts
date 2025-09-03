import { pgTable, text, timestamp, uuid, json, integer, boolean } from 'drizzle-orm/pg-core';
import { speeches } from './speeches';
import { users } from './auth';

// Quality issues and red flags
export const qualityIssues = pgTable('quality_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Issue classification
  issueType: text('issue_type').notNull(), // 'fact_check', 'cliche', 'plagiarism', 'risk_claim', 'sensitive_topic'
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  status: text('status').notNull().default('unresolved'), // 'unresolved', 'acknowledged', 'resolved', 'false_positive'
  
  // Issue details
  title: text('title').notNull(),
  description: text('description').notNull(),
  flaggedText: text('flagged_text'), // The specific text that triggered the flag
  startPosition: integer('start_position'), // Character position in the speech
  endPosition: integer('end_position'),
  
  // Suggestions and metadata
  suggestions: json('suggestions'), // Array of suggested fixes
  metadata: json('metadata'), // Additional context (sources, confidence scores, etc.)
  
  // Resolution tracking
  userResponse: text('user_response'), // User's response to the flag
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export blocks - prevent exports when quality issues exist
export const exportBlocks = pgTable('export_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  blockType: text('block_type').notNull(), // 'quality_issues', 'incomplete_verification', 'compliance_check'
  blockReason: text('block_reason').notNull(),
  isActive: boolean('is_active').default(true),
  
  // Reference to the issues causing the block
  relatedIssueIds: json('related_issue_ids'), // Array of quality_issue IDs
  
  // Auto-resolve conditions
  autoResolveConditions: json('auto_resolve_conditions'), // Conditions for automatic resolution
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// Quality gate configuration
export const qualityGateConfig = pgTable('quality_gate_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Gate configuration
  name: text('name').notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(true),
  
  // Thresholds and rules
  rules: json('rules').notNull(), // Quality rules configuration
  severityThresholds: json('severity_thresholds'), // What severities block export
  
  // Behavior settings
  allowOverride: boolean('allow_override').default(false), // Can users override the block?
  requiresAdminApproval: boolean('requires_admin_approval').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type QualityIssue = typeof qualityIssues.$inferSelect;
export type NewQualityIssue = typeof qualityIssues.$inferInsert;
export type ExportBlock = typeof exportBlocks.$inferSelect;
export type NewExportBlock = typeof exportBlocks.$inferInsert;