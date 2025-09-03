import { pgTable, text, timestamp, uuid, json, boolean, integer } from 'drizzle-orm/pg-core';
import { speeches } from './speeches';
import { users } from './auth';
import { shareRole } from './types';

// Share links for speech collaboration
export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // URL-safe random token
  role: text('role', { enum: shareRole }).notNull(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  maxUses: integer('max_uses'), // Optional usage limit
  currentUses: integer('current_uses').default(0),
  description: text('description'), // Internal note about this link
  metadata: json('metadata'), // Additional share settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User permissions for direct speech access
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  grantedByUserId: uuid('granted_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: shareRole }).notNull(),
  canInviteOthers: boolean('can_invite_others').default(false),
  isAccepted: boolean('is_accepted').default(false),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Comments on speeches or sections
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').references(() => speechSections.id, { onDelete: 'cascade' }), // Optional: comment on specific section
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): any => comments.id, { onDelete: 'cascade' }), // For threaded comments
  content: text('content').notNull(),
  selectionStart: integer('selection_start'), // For inline comments
  selectionEnd: integer('selection_end'),
  selectionText: text('selection_text'), // The selected text being commented on
  isResolved: boolean('is_resolved').default(false),
  resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Suggested edits from collaborators
export const suggestedEdits = pgTable('suggested_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').references(() => speechSections.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  originalText: text('original_text').notNull(),
  suggestedText: text('suggested_text').notNull(),
  selectionStart: integer('selection_start').notNull(),
  selectionEnd: integer('selection_end').notNull(),
  status: text('status').notNull().default('pending'), // pending, accepted, rejected
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewComment: text('review_comment'),
  appliedAt: timestamp('applied_at'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Import the speechSections from speeches schema
import { speechSections } from './speeches';