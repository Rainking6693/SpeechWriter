import { pgTable, text, timestamp, uuid, json, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { storyTag } from './types';

// User story vault for RAG retrieval
export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'), // AI-generated summary
  theme: text('theme'), // Main theme/category
  emotion: text('emotion'), // Primary emotional tone
  audienceType: text('audience_type'), // corporate, personal, etc.
  sensitivityLevel: text('sensitivity_level'), // low, medium, high
  tags: text('tags'), // Comma-separated tags from storyTag enum
  context: text('context'), // When/where this story is appropriate
  isPrivate: boolean('is_private').default(true),
  metadata: json('metadata'), // Additional story metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Vector embeddings for story retrieval (pgvector)
export const storyEmbeddings = pgTable('story_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  embedding: text('embedding').notNull(), // Vector embedding as text (will be converted to pgvector)
  model: text('model').notNull().default('text-embedding-ada-002'), // Embedding model used
  version: text('version').default('1.0'), // Embedding version for reprocessing
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Story tags for better categorization
export const storyTags = pgTable('story_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name', { enum: storyTag }).notNull().unique(),
  description: text('description'),
  color: text('color'), // Hex color for UI
  isSystemTag: boolean('is_system_tag').default(false), // System vs user tags
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Many-to-many relationship between stories and tags
export const storyTagRelations = pgTable('story_tag_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => storyTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});