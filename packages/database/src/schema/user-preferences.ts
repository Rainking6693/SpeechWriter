import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Jurisdiction types
export const jurisdictionTypes = ['US', 'EU', 'UK', 'CA', 'AU', 'OTHER'] as const;
export type JurisdictionType = typeof jurisdictionTypes[number];

// Ethics mode types
export const ethicsModes = ['standard', 'academic', 'political', 'corporate'] as const;
export type EthicsMode = typeof ethicsModes[number];

// User preferences for political/ethics compliance
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Jurisdiction settings
  jurisdiction: text('jurisdiction', { enum: jurisdictionTypes }).notNull().default('US'),
  jurisdictionConfirmed: boolean('jurisdiction_confirmed').default(false),
  
  // Ethics mode settings
  ethicsMode: text('ethics_mode', { enum: ethicsModes }).notNull().default('standard'),
  academicHonestyAccepted: boolean('academic_honesty_accepted').default(false),
  academicHonestyAcceptedAt: timestamp('academic_honesty_accepted_at'),
  
  // Content filtering preferences
  contentFilteringEnabled: boolean('content_filtering_enabled').default(true),
  politicalContentWarnings: boolean('political_content_warnings').default(true),
  
  // Export disclaimer preferences
  exportDisclaimerAccepted: boolean('export_disclaimer_accepted').default(false),
  exportDisclaimerVersion: text('export_disclaimer_version').default('1.0'),
  
  // Additional compliance settings
  complianceSettings: jsonb('compliance_settings').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content compliance flags for speeches
export const contentComplianceFlags = pgTable('content_compliance_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull(), // Will reference speeches table
  
  // Flag types
  flagType: text('flag_type').notNull(), // 'political', 'academic', 'ethical', 'legal'
  flagReason: text('flag_reason').notNull(),
  flagDescription: text('flag_description'),
  
  // Severity and status
  severity: text('severity').notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  status: text('status').notNull().default('active'), // 'active', 'acknowledged', 'resolved'
  
  // User acknowledgment
  acknowledgedByUserId: uuid('acknowledged_by_user_id').references(() => users.id),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgmentNote: text('acknowledgment_note'),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export compliance records
export const exportComplianceRecords = pgTable('export_compliance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Export details
  exportType: text('export_type').notNull(), // 'pdf', 'docx', 'txt'
  jurisdiction: text('jurisdiction', { enum: jurisdictionTypes }).notNull(),
  ethicsMode: text('ethics_mode', { enum: ethicsModes }).notNull(),
  
  // Compliance checks
  complianceChecksCompleted: boolean('compliance_checks_completed').default(false),
  disclaimerIncluded: boolean('disclaimer_included').default(false),
  disclaimerVersion: text('disclaimer_version'),
  
  // Flags acknowledged
  flagsAcknowledged: boolean('flags_acknowledged').default(false),
  acknowledgedFlagIds: jsonb('acknowledged_flag_ids').default([]),
  
  // Export metadata
  exportMetadata: jsonb('export_metadata').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});