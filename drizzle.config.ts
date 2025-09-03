import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default defineConfig({
  schema: './packages/database/src/schema/*.ts',
  out: './packages/database/src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/speechwriter',
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'timestamp',
  },
});