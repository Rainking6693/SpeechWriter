import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc, sql, count, avg, sum, and, gte } from 'drizzle-orm';
import postgres from 'postgres';
import { 
  modelRuns, 
  modelMetrics, 
  speechAnalytics, 
  telemetryEvents,
  users,
  speeches 
} from '@speechwriter/database/schema';
import jwt from 'jsonwebtoken';

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { 
  schema: { 
    modelRuns, 
    modelMetrics, 
    speechAnalytics, 
    telemetryEvents,
    users,
    speeches
  } 
});

// JWT verification for admin access
const verifyAdminToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
    // Check if user has admin role (this would be stored in your user table)
    return decoded?.role === 'admin' || decoded?.email === process.env.ADMIN_EMAIL;
  } catch {
    return false;
  }
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify admin authentication
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    if (!verifyAdminToken(token)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    // Get dashboard timeframe from query params
    const timeframe = event.queryStringParameters?.timeframe || '7d';
    const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Collect quality metrics
    const [
      modelRunStats,
      qualityMetrics,
      speechCompletionStats,
      userEngagement,
      errorRates,
      costAnalytics,
      recentFailures,
    ] = await Promise.all([
      // Model run statistics
      db
        .select({
          totalRuns: count(),
          avgLatency: avg(modelRuns.latencyMs),
          successRate: sql<number>`(COUNT(CASE WHEN ${modelRuns.success} THEN 1 END) * 100.0 / COUNT(*))`,
          totalCost: sum(modelRuns.cost),
          totalTokens: sum(modelRuns.totalTokens),
        })
        .from(modelRuns)
        .where(gte(modelRuns.createdAt, startDate)),

      // Quality metrics breakdown by metric type
      db
        .select({
          metricName: modelMetrics.metricName,
          avgValue: avg(modelMetrics.value),
          passRate: sql<number>`(COUNT(CASE WHEN ${modelMetrics.status} = 'pass' THEN 1 END) * 100.0 / COUNT(*))`,
          count: count(),
        })
        .from(modelMetrics)
        .innerJoin(modelRuns, eq(modelMetrics.modelRunId, modelRuns.id))
        .where(gte(modelRuns.createdAt, startDate))
        .groupBy(modelMetrics.metricName),

      // Speech completion analytics
      db
        .select({
          totalSpeeches: count(),
          avgTimeToFinal: avg(speechAnalytics.timeToFinal),
          avgEditBurden: avg(speechAnalytics.editBurden),
          avgQualityScore: avg(speechAnalytics.qualityScore),
          completionRate: sql<number>`(COUNT(CASE WHEN ${speechAnalytics.finalizedAt} IS NOT NULL THEN 1 END) * 100.0 / COUNT(*))`,
        })
        .from(speechAnalytics)
        .where(gte(speechAnalytics.createdAt, startDate)),

      // User engagement metrics
      db
        .select({
          activeUsers: sql<number>`COUNT(DISTINCT ${telemetryEvents.userId})`,
          totalEvents: count(),
          avgEventsPerUser: sql<number>`COUNT(*) / COUNT(DISTINCT ${telemetryEvents.userId})`,
        })
        .from(telemetryEvents)
        .where(gte(telemetryEvents.timestamp, startDate)),

      // Error analysis
      db
        .select({
          stage: modelRuns.stage,
          errorCount: count(),
          errorRate: sql<number>`(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${modelRuns} WHERE ${modelRuns.createdAt} >= ${startDate}))`,
        })
        .from(modelRuns)
        .where(
          and(
            gte(modelRuns.createdAt, startDate),
            eq(modelRuns.success, false)
          )
        )
        .groupBy(modelRuns.stage),

      // Cost analytics by stage/model
      db
        .select({
          stage: modelRuns.stage,
          model: modelRuns.model,
          totalCost: sum(modelRuns.cost),
          avgCost: avg(modelRuns.cost),
          runCount: count(),
        })
        .from(modelRuns)
        .where(gte(modelRuns.createdAt, startDate))
        .groupBy(modelRuns.stage, modelRuns.model),

      // Recent failures for investigation
      db
        .select({
          id: modelRuns.id,
          stage: modelRuns.stage,
          model: modelRuns.model,
          errorMessage: modelRuns.errorMessage,
          createdAt: modelRuns.createdAt,
          latencyMs: modelRuns.latencyMs,
        })
        .from(modelRuns)
        .where(
          and(
            gte(modelRuns.createdAt, startDate),
            eq(modelRuns.success, false)
          )
        )
        .orderBy(desc(modelRuns.createdAt))
        .limit(10),
    ]);

    // Format response
    const dashboard = {
      timeframe,
      generatedAt: new Date().toISOString(),
      
      overview: {
        totalModelRuns: modelRunStats[0]?.totalRuns || 0,
        avgLatency: Math.round(modelRunStats[0]?.avgLatency || 0),
        successRate: Math.round(modelRunStats[0]?.successRate || 0),
        totalCost: Number(modelRunStats[0]?.totalCost || 0).toFixed(2),
        totalTokens: modelRunStats[0]?.totalTokens || 0,
      },

      qualityMetrics: qualityMetrics.map(metric => ({
        name: metric.metricName,
        averageValue: Number(metric.avgValue || 0).toFixed(2),
        passRate: Math.round(metric.passRate || 0),
        sampleCount: metric.count,
      })),

      speechCompletionStats: {
        totalSpeeches: speechCompletionStats[0]?.totalSpeeches || 0,
        avgTimeToFinal: Math.round(speechCompletionStats[0]?.avgTimeToFinal || 0),
        avgEditBurden: Math.round(speechCompletionStats[0]?.avgEditBurden || 0),
        avgQualityScore: Number(speechCompletionStats[0]?.avgQualityScore || 0).toFixed(2),
        completionRate: Math.round(speechCompletionStats[0]?.completionRate || 0),
      },

      userEngagement: {
        activeUsers: userEngagement[0]?.activeUsers || 0,
        totalEvents: userEngagement[0]?.totalEvents || 0,
        avgEventsPerUser: Math.round(userEngagement[0]?.avgEventsPerUser || 0),
      },

      errorAnalysis: errorRates.map(error => ({
        stage: error.stage,
        errorCount: error.errorCount,
        errorRate: Number(error.errorRate || 0).toFixed(2),
      })),

      costAnalysis: costAnalytics.map(cost => ({
        stage: cost.stage,
        model: cost.model,
        totalCost: Number(cost.totalCost || 0).toFixed(2),
        avgCost: Number(cost.avgCost || 0).toFixed(4),
        runCount: cost.runCount,
      })),

      recentFailures: recentFailures.map(failure => ({
        id: failure.id,
        stage: failure.stage,
        model: failure.model,
        error: failure.errorMessage,
        timestamp: failure.createdAt,
        latency: failure.latencyMs,
      })),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(dashboard),
    };

  } catch (error) {
    console.error('Error generating admin dashboard:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate dashboard',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    };
  }
};

export { handler };