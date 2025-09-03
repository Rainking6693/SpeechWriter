import { createConnection, sql } from './connection';

/**
 * Set up database extensions and initial configuration
 */
export async function setupDatabase() {
  console.log('🔄 Setting up database extensions...');
  
  const { db, client } = createConnection();
  
  try {
    // Enable pgvector extension for vector embeddings
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log('✅ pgvector extension enabled');
    
    // Enable uuid-ossp for UUID generation (if not using defaultRandom)
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✅ uuid-ossp extension enabled');
    
    // Create custom vector type functions if needed
    // This is a placeholder for any custom vector operations
    
    console.log('✅ Database setup completed successfully');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Test database connection and extensions
 */
export async function testSetup() {
  console.log('🔄 Testing database setup...');
  
  const { db, client } = createConnection();
  
  try {
    // Test basic connection
    const result = await db.execute(sql`SELECT version()`);
    console.log('✅ Database connection successful');
    
    // Test pgvector extension
    try {
      await db.execute(sql`SELECT '[1,2,3]'::vector`);
      console.log('✅ pgvector extension is working');
    } catch (error) {
      console.warn('⚠️ pgvector extension may not be available:', error);
    }
    
    // Test UUID generation
    const uuidResult = await db.execute(sql`SELECT gen_random_uuid()`);
    console.log('✅ UUID generation is working');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error };
  } finally {
    await client.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => testSetup())
    .then((result) => {
      if (result.success) {
        console.log('✅ Database setup and test completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Database test failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Setup process failed:', error);
      process.exit(1);
    });
}