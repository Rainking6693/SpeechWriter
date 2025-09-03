import { pgTable, text, timestamp, uuid, integer, json, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { speechStatus } from './types';

// Main speeches table
export const speeches = pgTable('speeches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  occasion: text('occasion').notNull(),
  audience: text('audience').notNull(),
  targetDurationMinutes: integer('target_duration_minutes').notNull(),
  constraints: text('constraints'), // JSON string of constraints
  thesis: text('thesis'),
  status: text('status', { enum: speechStatus }).notNull().default('draft'),
  currentVersionId: uuid('current_version_id'), // References speech_versions.id
  metadata: json('metadata'), // Store brief form data, file references, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Speech sections (outline structure)
export const speechSections = pgTable('speech_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // The actual drafted content
  orderIndex: integer('order_index').notNull(),
  allocatedTimeMinutes: integer('allocated_time_minutes'),
  actualTimeMinutes: integer('actual_time_minutes'), // Calculated from content
  sectionType: text('section_type'), // opening, body, callback, close, etc.
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Speech versions for tracking changes and rollback
export const speechVersions = pgTable('speech_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  label: text('label'), // User-defined label like "Before humanization"
  fullText: text('full_text').notNull(), // Complete compiled speech text
  outline: json('outline'), // JSON representation of the outline at this version
  metadata: json('metadata'), // Version-specific metadata
  wordCount: integer('word_count'),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  isAutomatic: boolean('is_automatic').default(true), // Auto-generated vs user-created
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add the foreign key reference to speeches table
// This would need to be added via migration after both tables exist
// speeches.currentVersionId -> speechVersions.id