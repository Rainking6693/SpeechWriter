import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Environment validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test', 'preview']).default('development'),
  
  // Application
  NEXT_PUBLIC_APP_NAME: z.string().default('SpeechWriter'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_RATE_LIMIT_RPM: z.coerce.number().default(50),
  AI_RATE_LIMIT_TPM: z.coerce.number().default(100000),
  AI_MOCK_MODE: z.coerce.boolean().default(false),
  
  // Database
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  SUPABASE_DATABASE_URL: z.string().optional(),
  PGVECTOR_ENABLED: z.coerce.boolean().default(true),
  
  // Storage
  STORAGE_PROVIDER: z.enum(['s3', 'r2']).default('s3'),
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@speechwriter.app'),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // Stripe
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_FREE: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_TEAM: z.string().optional(),
  
  // Analytics & Monitoring
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_VERCEL_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_AUTH: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_PAYMENTS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_VECTOR_SEARCH: z.coerce.boolean().default(false),
  
  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000,https://aispeechwriter.netlify.app'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // Caching
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Development
  MOCK_AI_RESPONSES: z.coerce.boolean().default(false),
  DISABLE_TELEMETRY: z.coerce.boolean().default(false),
  DEBUG_MODE: z.coerce.boolean().default(false),
});

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:');
    
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    
    process.exit(1);
  }
}

// Export validated environment
export const env = parseEnv();

// Type for environment variables
export type Environment = z.infer<typeof envSchema>;

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isPreview = env.NODE_ENV === 'preview';

// Database URL helper
export const getDatabaseUrl = () => {
  return env.DATABASE_URL || env.NEON_DATABASE_URL || env.SUPABASE_DATABASE_URL;
};

// AI provider helpers
export const hasOpenAI = () => !!env.OPENAI_API_KEY;
export const hasAnthropic = () => !!env.ANTHROPIC_API_KEY;
export const hasAnyAIProvider = () => hasOpenAI() || hasAnthropic();

// Storage helpers
export const hasS3Storage = () => !!(
  env.S3_BUCKET_NAME && 
  env.S3_ACCESS_KEY_ID && 
  env.S3_SECRET_ACCESS_KEY
);

// Auth helpers
export const hasGoogleOAuth = () => !!(
  env.GOOGLE_CLIENT_ID && 
  env.GOOGLE_CLIENT_SECRET
);

// Email helpers
export const hasEmailProvider = () => !!(
  env.RESEND_API_KEY || 
  env.SENDGRID_API_KEY || 
  (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)
);

// Stripe helpers
export const hasStripe = () => !!(
  env.STRIPE_PUBLIC_KEY && 
  env.STRIPE_SECRET_KEY
);

// Validate required services for production
export const validateProductionServices = () => {
  if (!isProduction) return;
  
  const missingServices = [];
  
  if (!getDatabaseUrl()) {
    missingServices.push('Database (DATABASE_URL, NEON_DATABASE_URL, or SUPABASE_DATABASE_URL)');
  }
  
  if (!hasAnyAIProvider()) {
    missingServices.push('AI Provider (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
  }
  
  if (!hasEmailProvider()) {
    missingServices.push('Email Provider (RESEND_API_KEY, SENDGRID_API_KEY, or SMTP config)');
  }
  
  if (!env.NEXTAUTH_SECRET) {
    missingServices.push('NextAuth Secret (NEXTAUTH_SECRET)');
  }
  
  if (missingServices.length > 0) {
    console.error('❌ Production deployment missing required services:');
    missingServices.forEach(service => console.error(`  - ${service}`));
    process.exit(1);
  }
  
  console.log('✅ All required production services configured');
};