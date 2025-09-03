import { createConnection, sql } from './connection';

/**
 * Reset database by dropping all tables and extensions
 * WARNING: This will destroy all data!
 */
export async function resetDatabase() {
  console.log('🔄 Starting database reset...');
  console.log('⚠️  WARNING: This will destroy all data!');
  
  const { db, client } = createConnection();
  
  try {
    // Get all tables in the current database
    const tablesResult = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != '__drizzle_migrations'
    `);
    
    const tables = Array.from(tablesResult).map((row: any) => row.tablename);
    
    if (tables.length > 0) {
      console.log(`🗑️  Found ${tables.length} tables to drop:`, tables.join(', '));
      
      // Drop all tables (CASCADE to handle foreign keys)
      for (const tableName of tables) {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`));
        console.log(`  ✓ Dropped table: ${tableName}`);
      }
    }
    
    // Drop extensions (optional, but cleans everything)
    try {
      await db.execute(sql`DROP EXTENSION IF EXISTS vector`);
      console.log('  ✓ Dropped pgvector extension');
    } catch (error) {
      console.log('  ⚠️  pgvector extension not found or already dropped');
    }
    
    try {
      await db.execute(sql`DROP EXTENSION IF EXISTS "uuid-ossp"`);
      console.log('  ✓ Dropped uuid-ossp extension');
    } catch (error) {
      console.log('  ⚠️  uuid-ossp extension not found or already dropped');
    }
    
    // Reset migration table if exists
    try {
      await db.execute(sql`DELETE FROM __drizzle_migrations`);
      console.log('  ✓ Cleared migration history');
    } catch (error) {
      console.log('  ⚠️  Migration table not found');
    }
    
    console.log('🗑️✅ Database reset completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: pnpm db:setup     (to enable extensions)');
    console.log('  2. Run: pnpm db:migrate   (to recreate tables)');
    console.log('  3. Run: pnpm db:seed      (to add demo data)');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Soft reset - just truncate tables but keep structure
 */
export async function truncateTables() {
  console.log('🔄 Truncating all tables...');
  
  const { db, client } = createConnection();
  
  try {
    // Get all tables
    const tablesResult = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != '__drizzle_migrations'
    `);
    
    const tables = Array.from(tablesResult).map((row: any) => row.tablename);
    
    if (tables.length > 0) {
      // Disable foreign key constraints temporarily
      await db.execute(sql`SET session_replication_role = replica`);
      
      // Truncate all tables
      for (const tableName of tables) {
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`));
        console.log(`  ✓ Truncated table: ${tableName}`);
      }
      
      // Re-enable foreign key constraints
      await db.execute(sql`SET session_replication_role = DEFAULT`);
    }
    
    console.log('🗑️✅ All tables truncated successfully!');
    console.log('');
    console.log('Tables are empty but structure is preserved.');
    console.log('Run: pnpm db:seed to add demo data');
    
  } catch (error) {
    console.error('❌ Table truncation failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldTruncateOnly = args.includes('--truncate-only') || args.includes('-t');
  
  if (shouldTruncateOnly) {
    truncateTables()
      .then(() => {
        console.log('✅ Truncation completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Truncation failed:', error);
        process.exit(1);
      });
  } else {
    // Confirm before full reset
    console.log('⚠️  You are about to PERMANENTLY DELETE all data!');
    console.log('This action cannot be undone.');
    console.log('');
    console.log('To confirm, add --confirm flag');
    console.log('For truncate only (preserves structure), use --truncate-only flag');
    
    if (args.includes('--confirm')) {
      resetDatabase()
        .then(() => {
          console.log('✅ Reset completed successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Reset failed:', error);
          process.exit(1);
        });
    } else {
      console.log('❌ Reset cancelled - confirmation required');
      process.exit(1);
    }
  }
}