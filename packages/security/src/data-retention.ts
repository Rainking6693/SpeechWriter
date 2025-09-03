/**
 * Data Retention and Cleanup Service
 * 
 * Handles automated data deletion based on retention policies
 * and provides GDPR/CCPA compliance utilities.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, lt, and, eq } from 'drizzle-orm';
import postgres from 'postgres';
import {
  telemetryEvents,
  modelRuns,
  modelMetrics,
  speeches,
  speechAnalytics,
  qualityIssues,
  exportBlocks
} from '@speechwriter/database/schema';
import { DEFAULT_RETENTION_POLICIES, shouldDeleteData, encryptData } from './encryption';
import { serverAnalytics, ANALYTICS_EVENTS } from '@speechwriter/analytics';

interface RetentionResult {
  dataType: string;
  recordsDeleted: number;
  sizeFreedBytes?: number;
  errors?: string[];
}

/**
 * Data Retention Service
 */
export class DataRetentionService {
  private db: ReturnType<typeof drizzle>;

  constructor(databaseUrl?: string) {
    const client = postgres(databaseUrl || process.env.DATABASE_URL!, { prepare: false });
    this.db = drizzle(client);
  }

  /**
   * Run automated data retention cleanup
   */
  async runRetentionCleanup(): Promise<RetentionResult[]> {
    console.log('🗂️  Starting automated data retention cleanup...');
    
    const results: RetentionResult[] = [];
    const startTime = Date.now();

    try {
      // Clean up telemetry events
      results.push(await this.cleanupTelemetryData());
      
      // Clean up old model runs and metrics
      results.push(await this.cleanupModelData());
      
      // Clean up resolved quality issues (older than 1 year)
      results.push(await this.cleanupQualityData());
      
      // Clean up expired export blocks
      results.push(await this.cleanupExportBlocks());
      
      // Log retention summary
      const totalDeleted = results.reduce((sum, r) => sum + r.recordsDeleted, 0);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Retention cleanup completed: ${totalDeleted} records deleted in ${duration}ms`);
      
      // Track retention activity
      await serverAnalytics.track('system', 'data_retention_completed' as any, {
        total_records_deleted: totalDeleted,
        duration_ms: duration,
        data_types_processed: results.length,
      });

      return results;
      
    } catch (error) {
      console.error('❌ Data retention cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old telemetry events
   */
  private async cleanupTelemetryData(): Promise<RetentionResult> {
    const policy = DEFAULT_RETENTION_POLICIES.telemetry;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    try {
      const deletedRecords = await this.db
        .delete(telemetryEvents)
        .where(lt(telemetryEvents.timestamp, cutoffDate))
        .returning({ id: telemetryEvents.id });

      return {
        dataType: 'telemetry_events',
        recordsDeleted: deletedRecords.length,
      };
    } catch (error) {
      console.error('Failed to cleanup telemetry data:', error);
      return {
        dataType: 'telemetry_events',
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Clean up old model execution data
   */
  private async cleanupModelData(): Promise<RetentionResult> {
    const policy = DEFAULT_RETENTION_POLICIES.model_runs;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    try {
      // First delete metrics (foreign key constraint)
      const oldModelRuns = await this.db
        .select({ id: modelRuns.id })
        .from(modelRuns)
        .where(lt(modelRuns.createdAt, cutoffDate));

      const modelRunIds = oldModelRuns.map(run => run.id);
      
      let metricsDeleted = 0;
      if (modelRunIds.length > 0) {
        // Delete metrics first
        const deletedMetrics = await this.db
          .delete(modelMetrics)
          .where(sql`${modelMetrics.modelRunId} = ANY(${modelRunIds})`)
          .returning({ id: modelMetrics.id });
        
        metricsDeleted = deletedMetrics.length;
      }

      // Then delete model runs
      const deletedRuns = await this.db
        .delete(modelRuns)
        .where(lt(modelRuns.createdAt, cutoffDate))
        .returning({ id: modelRuns.id });

      return {
        dataType: 'model_execution_data',
        recordsDeleted: deletedRuns.length + metricsDeleted,
      };
    } catch (error) {
      console.error('Failed to cleanup model data:', error);
      return {
        dataType: 'model_execution_data',
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Clean up resolved quality issues older than 1 year
   */
  private async cleanupQualityData(): Promise<RetentionResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365); // 1 year

    try {
      const deletedIssues = await this.db
        .delete(qualityIssues)
        .where(
          and(
            lt(qualityIssues.resolvedAt, cutoffDate),
            sql`${qualityIssues.status} IN ('resolved', 'false_positive')`
          )
        )
        .returning({ id: qualityIssues.id });

      return {
        dataType: 'quality_issues',
        recordsDeleted: deletedIssues.length,
      };
    } catch (error) {
      console.error('Failed to cleanup quality data:', error);
      return {
        dataType: 'quality_issues',
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Clean up expired export blocks
   */
  private async cleanupExportBlocks(): Promise<RetentionResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days for resolved blocks

    try {
      const deletedBlocks = await this.db
        .delete(exportBlocks)
        .where(
          and(
            eq(exportBlocks.isActive, false),
            lt(exportBlocks.resolvedAt, cutoffDate)
          )
        )
        .returning({ id: exportBlocks.id });

      return {
        dataType: 'export_blocks',
        recordsDeleted: deletedBlocks.length,
      };
    } catch (error) {
      console.error('Failed to cleanup export blocks:', error);
      return {
        dataType: 'export_blocks',
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get data retention report for a user
   */
  async getUserDataReport(userId: string): Promise<{
    speeches: number;
    analytics: number;
    modelRuns: number;
    qualityIssues: number;
    totalSizeEstimate: string;
    retentionPolicies: typeof DEFAULT_RETENTION_POLICIES;
  }> {
    try {
      const [speechCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(speeches)
        .where(eq(speeches.userId, userId));

      const [analyticsCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(speechAnalytics)
        .where(eq(speechAnalytics.userId, userId));

      const [modelRunsCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(modelRuns)
        .where(eq(modelRuns.userId, userId));

      const [qualityIssuesCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(qualityIssues)
        .where(eq(qualityIssues.userId, userId));

      // Estimate total data size (rough calculation)
      const estimatedSizeBytes = 
        (speechCount.count * 2000) + // ~2KB per speech
        (analyticsCount.count * 100) + // ~100B per analytics record
        (modelRunsCount.count * 500) + // ~500B per model run
        (qualityIssuesCount.count * 300); // ~300B per quality issue

      const sizeInMB = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);

      return {
        speeches: speechCount.count,
        analytics: analyticsCount.count,
        modelRuns: modelRunsCount.count,
        qualityIssues: qualityIssuesCount.count,
        totalSizeEstimate: `${sizeInMB} MB`,
        retentionPolicies: DEFAULT_RETENTION_POLICIES,
      };
    } catch (error) {
      console.error('Failed to generate user data report:', error);
      throw error;
    }
  }

  /**
   * Securely delete all user data (for GDPR/CCPA compliance)
   */
  async deleteAllUserData(userId: string): Promise<{
    deletedRecords: Record<string, number>;
    success: boolean;
    errors?: string[];
  }> {
    console.log(`🗑️  Starting secure deletion of all data for user ${userId}`);
    
    const deletedRecords: Record<string, number> = {};
    const errors: string[] = [];

    try {
      // Use transaction for data consistency
      const result = await this.db.transaction(async (tx) => {
        // Delete in order of foreign key dependencies
        
        // 1. Delete model metrics (references model_runs)
        const metrics = await tx
          .delete(modelMetrics)
          .where(
            sql`${modelMetrics.modelRunId} IN (
              SELECT id FROM ${modelRuns} WHERE user_id = ${userId}
            )`
          )
          .returning({ id: modelMetrics.id });
        deletedRecords.modelMetrics = metrics.length;

        // 2. Delete model runs
        const runs = await tx
          .delete(modelRuns)
          .where(eq(modelRuns.userId, userId))
          .returning({ id: modelRuns.id });
        deletedRecords.modelRuns = runs.length;

        // 3. Delete quality issues
        const issues = await tx
          .delete(qualityIssues)
          .where(eq(qualityIssues.userId, userId))
          .returning({ id: qualityIssues.id });
        deletedRecords.qualityIssues = issues.length;

        // 4. Delete export blocks
        const blocks = await tx
          .delete(exportBlocks)
          .where(eq(exportBlocks.userId, userId))
          .returning({ id: exportBlocks.id });
        deletedRecords.exportBlocks = blocks.length;

        // 5. Delete speech analytics
        const analytics = await tx
          .delete(speechAnalytics)
          .where(eq(speechAnalytics.userId, userId))
          .returning({ id: speechAnalytics.id });
        deletedRecords.speechAnalytics = analytics.length;

        // 6. Delete telemetry events
        const telemetry = await tx
          .delete(telemetryEvents)
          .where(eq(telemetryEvents.userId, userId))
          .returning({ id: telemetryEvents.id });
        deletedRecords.telemetryEvents = telemetry.length;

        // 7. Delete speeches (this should cascade to sections)
        const userSpeeches = await tx
          .delete(speeches)
          .where(eq(speeches.userId, userId))
          .returning({ id: speeches.id });
        deletedRecords.speeches = userSpeeches.length;

        return true;
      });

      const totalDeleted = Object.values(deletedRecords).reduce((sum, count) => sum + count, 0);
      
      // Track user data deletion
      await serverAnalytics.track('system', 'user_data_deleted' as any, {
        user_id: userId,
        total_records_deleted: totalDeleted,
        deletion_requested_at: new Date().toISOString(),
      });

      console.log(`✅ Successfully deleted ${totalDeleted} records for user ${userId}`);
      
      return {
        deletedRecords,
        success: true,
      };
      
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        deletedRecords,
        success: false,
        errors,
      };
    }
  }

  /**
   * Schedule retention cleanup (for cron jobs)
   */
  static async scheduleRetentionCleanup(): Promise<void> {
    const service = new DataRetentionService();
    
    try {
      await service.runRetentionCleanup();
    } catch (error) {
      console.error('Scheduled retention cleanup failed:', error);
      // In production, this might send alerts to administrators
    }
  }
}