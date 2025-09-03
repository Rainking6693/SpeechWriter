import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

// Global connection instance to avoid multiple connections
let globalConnection: ReturnType<typeof drizzle> | undefined;
let globalClient: ReturnType<typeof postgres> | undefined;

/**
 * Get database connection URL from environment
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  return url;
}

/**
 * Create a new database connection
 */
export function createConnection() {
  const databaseUrl = getDatabaseUrl();
  
  // Create postgres client
  const client = postgres(databaseUrl, {
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    prepare: true, // Use prepared statements for better performance
  });
  
  // Create Drizzle instance with schema
  const db = drizzle(client, { 
    schema,
    logger: process.env.NODE_ENV === 'development' ? true : false
  });
  
  return { db, client };
}

/**
 * Get the global database connection (singleton pattern)
 * This is recommended for serverless environments like Netlify Functions
 */
export function getDb() {
  if (!globalConnection || !globalClient) {
    const { db, client } = createConnection();
    globalConnection = db;
    globalClient = client;
  }
  
  return globalConnection;
}

/**
 * Close the database connection
 * Call this when shutting down the application
 */
export async function closeConnection() {
  if (globalClient) {
    await globalClient.end();
    globalConnection = undefined;
    globalClient = undefined;
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const db = getDb();
    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Re-export commonly used items for convenience
export { sql } from 'drizzle-orm';
export type { DB } from './schema/types';

// TypeScript type for the database instance
export type Database = ReturnType<typeof getDb>;