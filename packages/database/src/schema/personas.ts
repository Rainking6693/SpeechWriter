import { pgTable, text, timestamp, uuid, json, real, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

// User personas for speech style
export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  toneSliders: json('tone_sliders'), // JSON object with tone settings
  doList: text('do_list'), // Comma-separated or JSON list
  dontList: text('dont_list'), // Comma-separated or JSON list
  sampleText: text('sample_text'), // User-provided sample text
  isDefault: boolean('is_default').default(false),
  isPreset: boolean('is_preset').default(false), // System presets like "Inspirational Leader"
  metadata: json('metadata'), // Additional persona settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Style cards - processed persona characteristics
export const styleCards = pgTable('style_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
  avgSentenceLength: real('avg_sentence_length'),
  posRhythm: json('pos_rhythm'), // Part-of-speech rhythm patterns
  metaphorDomains: json('metaphor_domains'), // Preferred metaphor categories
  vocabularyComplexity: real('vocabulary_complexity'),
  rhetoricalDevices: json('rhetorical_devices'), // Preferred devices and frequency
  embedding: text('embedding'), // Vector embedding as text/JSON
  isProcessed: boolean('is_processed').default(false),
  processingError: text('processing_error'), // Store any processing errors
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stylometry data - detailed linguistic analysis
export const stylometryData = pgTable('stylometry_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
  textSample: text('text_sample'), // The analyzed text
  features: json('features'), // Extracted stylometric features
  lexicalDiversity: real('lexical_diversity'),
  syntacticComplexity: real('syntactic_complexity'),
  sentimentScores: json('sentiment_scores'),
  readabilityScores: json('readability_scores'), // Flesch-Kincaid, etc.
  distance: real('distance'), // Distance from target persona
  analysisVersion: text('analysis_version').default('1.0'), // Track analysis algorithm version
  createdAt: timestamp('created_at').defaultNow().notNull(),
});