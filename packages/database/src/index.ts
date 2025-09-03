// Main exports for the database package
export * from './schema';
export * from './connection';
export * from './utils';

// Re-export specific items for convenience
export { getDb, createConnection, closeConnection, testConnection, sql } from './connection';
export type { Database, DB } from './connection';

// Export schema collections and utilities
export { schemas } from './schema';
export { dbUtils } from './utils';

// Export migration and setup functions
export { runMigrations } from './migrate';
export { setupDatabase, testSetup } from './setup';
export { seedDatabase } from './seed';
export { resetDatabase, truncateTables } from './reset';