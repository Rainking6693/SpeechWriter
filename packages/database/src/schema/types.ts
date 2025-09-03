// Common types and enums used across schemas

export const subscriptionStatus = ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'] as const;
export const subscriptionPlan = ['free', 'pro', 'team'] as const;
export const speechStatus = ['draft', 'outlining', 'drafting', 'humanizing', 'reviewing', 'completed'] as const;
export const shareRole = ['viewer', 'commenter', 'editor'] as const;
export const modelProvider = ['openai', 'anthropic', 'local'] as const;
export const humanizationPassType = ['rhetoric', 'persona', 'critic1', 'critic2', 'referee', 'cultural'] as const;
export const storyTag = ['personal', 'professional', 'inspirational', 'humorous', 'emotional', 'technical', 'sensitive'] as const;

export type SubscriptionStatus = typeof subscriptionStatus[number];
export type SubscriptionPlan = typeof subscriptionPlan[number];
export type SpeechStatus = typeof speechStatus[number];
export type ShareRole = typeof shareRole[number];
export type ModelProvider = typeof modelProvider[number];
export type HumanizationPassType = typeof humanizationPassType[number];
export type StoryTag = typeof storyTag[number];

// Database type for Drizzle instance
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './index';

export type DB = PostgresJsDatabase<typeof schema>;