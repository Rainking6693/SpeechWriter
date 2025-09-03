/**
 * Row-Level Security Context Management
 * 
 * This module provides utilities for managing database user context
 * to enforce row-level security policies.
 */

import { sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';

export interface RLSContext {
  userId: string;
  role?: 'user' | 'admin';
  sessionId?: string;
}

/**
 * Set the current user context for RLS policies
 */
export async function setRLSContext(
  db: PgDatabase<any>,
  context: RLSContext
): Promise<void> {
  try {
    // Set the current user ID in PostgreSQL session
    await db.execute(
      sql`SELECT set_config('app.current_user_id', ${context.userId}, true)`
    );
    
    // Set additional context if provided
    if (context.role) {
      await db.execute(
        sql`SELECT set_config('app.current_user_role', ${context.role}, true)`
      );
    }
    
    if (context.sessionId) {
      await db.execute(
        sql`SELECT set_config('app.session_id', ${context.sessionId}, true)`
      );
    }
    
    // Ensure RLS is enabled
    await db.execute(sql`SET row_security = on`);
    
  } catch (error) {
    console.error('Failed to set RLS context:', error);
    throw new Error('Database security context setup failed');
  }
}

/**
 * Clear the current user context (for connection cleanup)
 */
export async function clearRLSContext(db: PgDatabase<any>): Promise<void> {
  try {
    await db.execute(
      sql`SELECT set_config('app.current_user_id', '', true)`
    );
    await db.execute(
      sql`SELECT set_config('app.current_user_role', '', true)`
    );
    await db.execute(
      sql`SELECT set_config('app.session_id', '', true)`
    );
  } catch (error) {
    console.error('Failed to clear RLS context:', error);
    // Don't throw here as this is cleanup
  }
}

/**
 * Execute a database operation with specific user context
 */
export async function withUserContext<T>(
  db: PgDatabase<any>,
  context: RLSContext,
  operation: () => Promise<T>
): Promise<T> {
  await setRLSContext(db, context);
  
  try {
    const result = await operation();
    return result;
  } finally {
    await clearRLSContext(db);
  }
}

/**
 * Execute a database operation with admin privileges
 * Use with extreme caution and only for system operations
 */
export async function withAdminContext<T>(
  db: PgDatabase<any>,
  operation: () => Promise<T>
): Promise<T> {
  // Temporarily disable RLS for admin operations
  await db.execute(sql`SET row_security = off`);
  
  try {
    const result = await operation();
    return result;
  } finally {
    // Always re-enable RLS
    await db.execute(sql`SET row_security = on`);
  }
}

/**
 * Verify that RLS is properly configured and working
 */
export async function verifyRLSSetup(db: PgDatabase<any>): Promise<boolean> {
  try {
    // Test that RLS is enabled on key tables
    const rlsStatus = await db.execute(sql`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('speeches', 'personas', 'stories', 'model_runs')
    `);
    
    const results = rlsStatus.rows as Array<{
      schemaname: string;
      tablename: string;
      rowsecurity: boolean;
    }>;
    
    const rlsEnabled = results.every(row => row.rowsecurity);
    
    if (!rlsEnabled) {
      console.error('RLS not enabled on all required tables:', results);
      return false;
    }
    
    // Test that policies exist
    const policyCount = await db.execute(sql`
      SELECT COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN ('speeches', 'personas', 'stories', 'model_runs')
    `);
    
    const count = (policyCount.rows[0] as any)?.policy_count || 0;
    
    if (count < 8) { // We should have at least 8 policies
      console.error(`Insufficient RLS policies found: ${count}`);
      return false;
    }
    
    console.log(`✅ RLS verification passed: ${count} policies across ${results.length} tables`);
    return true;
    
  } catch (error) {
    console.error('RLS verification failed:', error);
    return false;
  }
}

/**
 * Get current RLS context information (for debugging)
 */
export async function getCurrentRLSContext(db: PgDatabase<any>): Promise<{
  userId: string | null;
  role: string | null;
  sessionId: string | null;
  rlsEnabled: boolean;
}> {
  try {
    const context = await db.execute(sql`
      SELECT 
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.current_user_role', true) as role,
        current_setting('app.session_id', true) as session_id,
        current_setting('row_security', true) as rls_enabled
    `);
    
    const row = context.rows[0] as any;
    
    return {
      userId: row.user_id || null,
      role: row.role || null,
      sessionId: row.session_id || null,
      rlsEnabled: row.rls_enabled === 'on',
    };
  } catch (error) {
    console.error('Failed to get RLS context:', error);
    throw error;
  }
}

/**
 * Audit function to log RLS context usage
 */
export async function auditRLSAccess(
  db: PgDatabase<any>,
  operation: string,
  tableName: string,
  recordCount?: number
): Promise<void> {
  try {
    const context = await getCurrentRLSContext(db);
    
    // Log to telemetry or audit table
    console.log(`RLS Audit: ${operation} on ${tableName}`, {
      userId: context.userId,
      role: context.role,
      recordCount,
      timestamp: new Date().toISOString(),
    });
    
    // In production, you might want to store this in an audit table
    // await db.insert(auditLog).values({...});
    
  } catch (error) {
    console.error('RLS audit logging failed:', error);
    // Don't throw, as audit failures shouldn't break operations
  }
}