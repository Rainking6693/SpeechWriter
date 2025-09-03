import { pgTable, text, timestamp, uuid, json, real, integer, boolean } from 'drizzle-orm/pg-core';
import { speeches } from './speeches';
import { users } from './auth';
import { humanizationPassType } from './types';

// Humanization passes - track each humanization step
export const humanizationPasses = pgTable('humanization_passes', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  passType: text('pass_type', { enum: humanizationPassType }).notNull(),
  inputText: text('input_text').notNull(),
  outputText: text('output_text').notNull(),
  passOrder: integer('pass_order').notNull(), // Order of execution
  changes: json('changes'), // JSON array of specific changes made
  metrics: json('metrics'), // Scores and measurements
  processingTimeMs: integer('processing_time_ms'),
  modelUsed: text('model_used'),
  promptVersion: text('prompt_version'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Critic feedback for ensemble humanization
export const criticFeedback = pgTable('critic_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  humanizationPassId: uuid('humanization_pass_id').notNull().references(() => humanizationPasses.id, { onDelete: 'cascade' }),
  criticType: text('critic_type').notNull(), // critic1, critic2, referee
  specificityScore: real('specificity_score'),
  freshnessScore: real('freshness_score'),
  performabilityScore: real('performability_score'),
  personaFitScore: real('persona_fit_score'),
  overallScore: real('overall_score'),
  suggestions: json('suggestions'), // JSON array of suggested edits
  feedback: text('feedback'), // Text feedback from critic
  acceptedEdits: json('accepted_edits'), // Which edits were accepted by referee
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cliché detection and scoring
export const clicheAnalysis = pgTable('cliche_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  textSample: text('text_sample').notNull(),
  detectedCliches: json('detected_cliches'), // JSON array of found clichés
  clicheDensity: real('cliche_density'), // Clichés per 100 tokens
  replacementSuggestions: json('replacement_suggestions'),
  overallScore: real('overall_score'), // 0-1 score, lower is better
  analysisVersion: text('analysis_version').default('1.0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cultural sensitivity checks
export const culturalSensitivityChecks = pgTable('cultural_sensitivity_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  speechId: uuid('speech_id').notNull().references(() => speeches.id, { onDelete: 'cascade' }),
  textSample: text('text_sample').notNull(),
  flaggedPhrases: json('flagged_phrases'), // JSON array of problematic phrases
  suggestions: json('suggestions'), // Alternative phrasing suggestions
  riskLevel: text('risk_level').notNull(), // low, medium, high
  categories: json('categories'), // Categories of sensitivity issues
  reviewRequired: boolean('review_required').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});