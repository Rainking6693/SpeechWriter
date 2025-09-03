import { z } from 'zod';

// Transform string to boolean for environment variables
const stringToBoolean = z.string().transform(val => val === 'true');
const optionalStringToBoolean = z.string().transform(val => val === 'true').optional();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('SpeechWriter'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_RATE_LIMIT_RPM: z.string().transform(val => parseInt(val, 10)).default('50'),
  AI_RATE_LIMIT_TPM: z.string().transform(val => parseInt(val, 10)).default('100000'),
  AI_MOCK_MODE: stringToBoolean.default('false'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  SUPABASE_DATABASE_URL: z.string().optional(),
  PGVECTOR_ENABLED: stringToBoolean.default('true'),
  
  // Storage
  STORAGE_PROVIDER: z.enum(['s3', 'r2', 'gcs']).default('s3'),
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@speechwriter.app'),
  
  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => parseInt(val, 10)).default('587'),
  SMTP_SECURE: optionalStringToBoolean,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // Stripe Configuration
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_FREE: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_TEAM: z.string().optional(),
  
  // Analytics & Monitoring
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_VERCEL_ANALYTICS: stringToBoolean.default('false'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: stringToBoolean.default('false'),
  NEXT_PUBLIC_ENABLE_AUTH: stringToBoolean.default('false'),
  NEXT_PUBLIC_ENABLE_PAYMENTS: stringToBoolean.default('false'),
  NEXT_PUBLIC_ENABLE_VECTOR_SEARCH: stringToBoolean.default('false'),
  
  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),
  
  // Caching
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().transform(val => parseInt(val, 10)).default('3600'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Development
  MOCK_AI_RESPONSES: stringToBoolean.default('false'),
  DISABLE_TELEMETRY: stringToBoolean.default('false'),
  DEBUG_MODE: stringToBoolean.default('false'),
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
export const env = envSchema.parse(process.env);

// Environment helpers
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Database helpers
export const getDatabaseUrl = (): string | undefined => {
  return env.DATABASE_URL || env.NEON_DATABASE_URL || env.SUPABASE_DATABASE_URL;
};

// Storage helpers
export const getStorageConfig = () => ({
  provider: env.STORAGE_PROVIDER,
  bucket: env.S3_BUCKET_NAME,
  region: env.S3_REGION,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  endpoint: env.S3_ENDPOINT,
});

// Email provider helpers
export const getEmailProvider = () => {
  if (env.RESEND_API_KEY) return 'resend';
  if (env.SENDGRID_API_KEY) return 'sendgrid';
  if (env.SMTP_HOST) return 'smtp';
  return null;
};

// CORS origins helper
export const getCorsOrigins = (): string[] => {
  return env.CORS_ORIGINS.split(',').map(origin => origin.trim());
};

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof Pick<Env, 
  'NEXT_PUBLIC_ENABLE_ANALYTICS' | 
  'NEXT_PUBLIC_ENABLE_AUTH' | 
  'NEXT_PUBLIC_ENABLE_PAYMENTS' | 
  'NEXT_PUBLIC_ENABLE_VECTOR_SEARCH'
>): boolean => {
  return env[feature];
};

// AI service helpers
export const getAvailableAIProviders = (): string[] => {
  const providers: string[] = [];
  if (env.OPENAI_API_KEY) providers.push('openai');
  if (env.ANTHROPIC_API_KEY) providers.push('anthropic');
  return providers;
};