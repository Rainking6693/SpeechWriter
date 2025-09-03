import { pgTable, text, timestamp, uuid, boolean, integer } from 'drizzle-orm/pg-core';
import { subscriptionStatus, subscriptionPlan } from './types';

// Users table - main user entities
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth accounts
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions for auth
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Verification tokens for email verification, password reset, etc.
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User subscriptions and billing
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePriceId: text('stripe_price_id'),
  status: text('status', { enum: subscriptionStatus }).notNull().default('incomplete'),
  plan: text('plan', { enum: subscriptionPlan }).notNull().default('free'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stripe products
export const products = pgTable('products', {
  id: text('id').primaryKey(), // Stripe product ID
  name: text('name').notNull(),
  description: text('description'),
  active: boolean('active').default(true),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stripe prices
export const prices = pgTable('prices', {
  id: text('id').primaryKey(), // Stripe price ID
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  active: boolean('active').default(true),
  currency: text('currency').notNull().default('usd'),
  unitAmount: integer('unit_amount'), // Price in cents
  interval: text('interval'), // month, year, etc.
  intervalCount: integer('interval_count').default(1),
  type: text('type').notNull(), // one_time, recurring
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscription items (for complex billing)
export const subscriptionItems = pgTable('subscription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  stripeSubscriptionItemId: text('stripe_subscription_item_id').unique(),
  priceId: text('price_id').notNull().references(() => prices.id),
  quantity: integer('quantity').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});