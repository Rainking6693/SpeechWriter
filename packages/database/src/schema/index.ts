// Export all database schemas
export * from './types';
export * from './auth';
export * from './speeches';
export * from './personas';
export * from './stories';
export * from './humanization';
export * from './observability';
export * from './collaboration';
export * from './quality-gates';
export * from './user-preferences';

// Re-export commonly used types from drizzle
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Export schema collections for easier importing
import * as authSchema from './auth';
import * as speechesSchema from './speeches';
import * as personasSchema from './personas';
import * as storiesSchema from './stories';
import * as humanizationSchema from './humanization';
import * as observabilitySchema from './observability';
import * as collaborationSchema from './collaboration';
import * as qualityGatesSchema from './quality-gates';
import * as userPreferencesSchema from './user-preferences';

export const schemas = {
  auth: authSchema,
  speeches: speechesSchema,
  personas: personasSchema,
  stories: storiesSchema,
  humanization: humanizationSchema,
  observability: observabilitySchema,
  collaboration: collaborationSchema,
  qualityGates: qualityGatesSchema,
  userPreferences: userPreferencesSchema,
};