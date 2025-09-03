import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createConnection } from './connection';
import path from 'path';

/**
 * Run database migrations
 */
export async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  const { db, client } = createConnection();
  
  try {
    // Run migrations from the migrations folder
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close the connection
    await client.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ All migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}