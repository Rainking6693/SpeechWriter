import { getDb } from './connection';
import { eq, and, or, desc, asc, count, sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Database utilities for common operations
 */

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const db = getDb();
  
  try {
    const stats = {
      users: await db.select({ count: count() }).from(schema.users),
      speeches: await db.select({ count: count() }).from(schema.speeches),
      personas: await db.select({ count: count() }).from(schema.personas),
      stories: await db.select({ count: count() }).from(schema.stories),
      comments: await db.select({ count: count() }).from(schema.comments),
      modelRuns: await db.select({ count: count() }).from(schema.modelRuns),
    };
    
    return {
      users: stats.users[0]?.count || 0,
      speeches: stats.speeches[0]?.count || 0,
      personas: stats.personas[0]?.count || 0,
      stories: stats.stories[0]?.count || 0,
      comments: stats.comments[0]?.count || 0,
      modelRuns: stats.modelRuns[0]?.count || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

/**
 * Health check for database connection and key tables
 */
export async function healthCheck() {
  const db = getDb();
  
  try {
    // Test basic connection
    await db.execute(sql`SELECT 1`);
    
    // Test all major tables exist
    const tableChecks = await Promise.all([
      db.select().from(schema.users).limit(1),
      db.select().from(schema.speeches).limit(1),
      db.select().from(schema.personas).limit(1),
      db.select().from(schema.stories).limit(1),
      db.select().from(schema.storyEmbeddings).limit(1),
    ]);
    
    // Test pgvector extension
    let vectorSupport = false;
    try {
      await db.execute(sql`SELECT '[1,2,3]'::vector`);
      vectorSupport = true;
    } catch {
      vectorSupport = false;
    }
    
    return {
      status: 'healthy',
      connection: true,
      tables: true,
      vectorSupport,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connection: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Find speeches by user with full details
 */
export async function getUserSpeeches(userId: string, limit = 10, offset = 0) {
  const db = getDb();
  
  return await db
    .select({
      id: schema.speeches.id,
      title: schema.speeches.title,
      occasion: schema.speeches.occasion,
      status: schema.speeches.status,
      targetDurationMinutes: schema.speeches.targetDurationMinutes,
      createdAt: schema.speeches.createdAt,
      updatedAt: schema.speeches.updatedAt,
      currentVersion: {
        id: schema.speechVersions.id,
        versionNumber: schema.speechVersions.versionNumber,
        wordCount: schema.speechVersions.wordCount,
        estimatedDurationMinutes: schema.speechVersions.estimatedDurationMinutes,
      }
    })
    .from(schema.speeches)
    .leftJoin(
      schema.speechVersions, 
      eq(schema.speeches.currentVersionId, schema.speechVersions.id)
    )
    .where(eq(schema.speeches.userId, userId))
    .orderBy(desc(schema.speeches.updatedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Search stories by content or tags for RAG retrieval
 */
export async function searchStories(
  userId: string, 
  query?: string, 
  tags?: string[], 
  limit = 5
) {
  const db = getDb();
  
  let conditions = [eq(schema.stories.userId, userId)];
  
  // Add text search if query provided (simplified - in production would use full-text search)
  if (query) {
    conditions.push(
      or(
        sql`${schema.stories.content} ILIKE ${`%${query}%`}`,
        sql`${schema.stories.title} ILIKE ${`%${query}%`}`,
        sql`${schema.stories.theme} ILIKE ${`%${query}%`}`
      ) as any
    );
  }
  
  return await db
    .select({
      id: schema.stories.id,
      title: schema.stories.title,
      content: schema.stories.content,
      summary: schema.stories.summary,
      theme: schema.stories.theme,
      emotion: schema.stories.emotion,
      tags: schema.stories.tags,
    })
    .from(schema.stories)
    .where(and(...conditions))
    .limit(limit);
}

/**
 * Get persona with style card
 */
export async function getPersonaWithStyleCard(personaId: string) {
  const db = getDb();
  
  const result = await db
    .select({
      persona: schema.personas,
      styleCard: schema.styleCards,
    })
    .from(schema.personas)
    .leftJoin(schema.styleCards, eq(schema.personas.id, schema.styleCards.personaId))
    .where(eq(schema.personas.id, personaId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get recent model runs for analytics
 */
export async function getRecentModelRuns(limit = 50, userId?: string) {
  const db = getDb();
  
  let baseQuery = db
    .select({
      id: schema.modelRuns.id,
      provider: schema.modelRuns.provider,
      model: schema.modelRuns.model,
      stage: schema.modelRuns.stage,
      totalTokens: schema.modelRuns.totalTokens,
      cost: schema.modelRuns.cost,
      latencyMs: schema.modelRuns.latencyMs,
      success: schema.modelRuns.success,
      createdAt: schema.modelRuns.createdAt,
      userId: schema.modelRuns.userId,
      speechTitle: schema.speeches.title,
    })
    .from(schema.modelRuns)
    .leftJoin(schema.speeches, eq(schema.modelRuns.speechId, schema.speeches.id))
    .orderBy(desc(schema.modelRuns.createdAt))
    .limit(limit);
  
  if (userId) {
    return await baseQuery.where(eq(schema.modelRuns.userId, userId));
  }
  
  return await baseQuery;
}

/**
 * Calculate speech analytics summary
 */
export async function getSpeechAnalyticsSummary(userId?: string) {
  const db = getDb();
  
  let baseQuery = db.select({
    totalSpeeches: count(),
    avgTimeToFinal: sql<number>`AVG(${schema.speechAnalytics.timeToFinal})`,
    avgEditBurden: sql<number>`AVG(${schema.speechAnalytics.editBurden})`,
    avgQualityScore: sql<number>`AVG(${schema.speechAnalytics.qualityScore})`,
    avgUserSatisfaction: sql<number>`AVG(${schema.speechAnalytics.userSatisfaction})`,
  }).from(schema.speechAnalytics);
  
  if (userId) {
    const result = await baseQuery.where(eq(schema.speechAnalytics.userId, userId));
    return result[0] || null;
  }
  
  const result = await baseQuery;
  return result[0] || null;
}

/**
 * Get active subscriptions count
 */
export async function getActiveSubscriptionsCount() {
  const db = getDb();
  
  const result = await db
    .select({ count: count() })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.status, 'active'));
  
  return result[0]?.count || 0;
}

/**
 * Cleanup old data (for maintenance)
 */
export async function cleanupOldData(daysOld = 90) {
  const db = getDb();
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  try {
    // Clean up old telemetry events
    const telemetryResult = await db
      .delete(schema.telemetryEvents)
      .where(sql`${schema.telemetryEvents.timestamp} < ${cutoffDate}`)
      .returning({ count: count() });
    
    // Clean up old model runs (keep recent ones for analytics)
    const modelRunsResult = await db
      .delete(schema.modelRuns)
      .where(
        and(
          sql`${schema.modelRuns.createdAt} < ${cutoffDate}`,
          eq(schema.modelRuns.success, false) // Keep successful runs longer
        )
      )
      .returning({ count: count() });
    
    console.log(`✅ Cleaned up old data:`);
    console.log(`  • Telemetry events: ${telemetryResult.length} records`);
    console.log(`  • Failed model runs: ${modelRunsResult.length} records`);
    
    return {
      telemetryEvents: telemetryResult.length,
      modelRuns: modelRunsResult.length,
    };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Export utilities for CLI or external usage
 */
export const dbUtils = {
  getDatabaseStats,
  healthCheck,
  getUserSpeeches,
  searchStories,
  getPersonaWithStyleCard,
  getRecentModelRuns,
  getSpeechAnalyticsSummary,
  getActiveSubscriptionsCount,
  cleanupOldData,
};