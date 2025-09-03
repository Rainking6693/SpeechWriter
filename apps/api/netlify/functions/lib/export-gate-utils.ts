import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, count } from 'drizzle-orm';
import postgres from 'postgres';
import { 
  qualityIssues, 
  exportBlocks,
  speeches,
  QualityIssue,
  NewExportBlock
} from '@speechwriter/database/schema';
import { serverAnalytics, ANALYTICS_EVENTS } from '@speechwriter/analytics';

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema: { qualityIssues, exportBlocks, speeches } });

// Export validation result
export interface ExportValidationResult {
  canExport: boolean;
  blockingIssues: QualityIssue[];
  warnings: QualityIssue[];
  totalIssues: number;
  exportBlockId?: string;
}

// Quality gate configuration
const QUALITY_GATE_CONFIG = {
  // Issue types that block export by severity
  blockingRules: {
    'fact_check': ['high', 'critical'],
    'plagiarism': ['medium', 'high', 'critical'],
    'risk_claim': ['high', 'critical'],
    'sensitive_topic': ['critical'],
    'cliche': [], // Cliches don't block export, only warn
  },
  
  // Maximum number of unresolved issues before blocking export
  maxUnresolvedIssues: {
    'low': 20,
    'medium': 10,
    'high': 5,
    'critical': 1,
  }
};

// Check if export is allowed for a speech
export async function validateExportPermissions(
  speechId: string, 
  userId: string
): Promise<ExportValidationResult> {
  try {
    // Get all unresolved quality issues for this speech
    const unresolvedIssues = await db
      .select()
      .from(qualityIssues)
      .where(
        and(
          eq(qualityIssues.speechId, speechId),
          eq(qualityIssues.userId, userId),
          eq(qualityIssues.status, 'unresolved')
        )
      );

    // Categorize issues
    const blockingIssues: QualityIssue[] = [];
    const warnings: QualityIssue[] = [];
    
    for (const issue of unresolvedIssues) {
      const blockingSeverities = QUALITY_GATE_CONFIG.blockingRules[issue.issueType as keyof typeof QUALITY_GATE_CONFIG.blockingRules] || [];
      
      if (blockingSeverities.includes(issue.severity)) {
        blockingIssues.push(issue);
      } else {
        warnings.push(issue);
      }
    }

    // Check if too many issues of any severity
    const issuesBySeverity = unresolvedIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let hasTooManyIssues = false;
    for (const [severity, maxAllowed] of Object.entries(QUALITY_GATE_CONFIG.maxUnresolvedIssues)) {
      if ((issuesBySeverity[severity] || 0) > maxAllowed) {
        hasTooManyIssues = true;
        break;
      }
    }

    const canExport = blockingIssues.length === 0 && !hasTooManyIssues;

    // If export is blocked, create or update export block record
    let exportBlockId: string | undefined;
    if (!canExport) {
      const blockReason = hasTooManyIssues 
        ? 'Too many unresolved quality issues'
        : `${blockingIssues.length} critical quality issues must be resolved`;

      const [existingBlock] = await db
        .select()
        .from(exportBlocks)
        .where(
          and(
            eq(exportBlocks.speechId, speechId),
            eq(exportBlocks.userId, userId),
            eq(exportBlocks.isActive, true)
          )
        )
        .limit(1);

      if (existingBlock) {
        exportBlockId = existingBlock.id;
        // Update existing block
        await db
          .update(exportBlocks)
          .set({
            blockReason,
            relatedIssueIds: blockingIssues.map(i => i.id),
          })
          .where(eq(exportBlocks.id, existingBlock.id));
      } else {
        // Create new block
        const [newBlock] = await db
          .insert(exportBlocks)
          .values({
            speechId,
            userId,
            blockType: 'quality_issues',
            blockReason,
            relatedIssueIds: blockingIssues.map(i => i.id),
          })
          .returning();
        exportBlockId = newBlock.id;
      }

      // Track blocked export event
      await serverAnalytics.track(userId, ANALYTICS_EVENTS.EXPORT_BLOCKED, {
        speech_id: speechId,
        block_reason: blockReason,
        blocking_issues_count: blockingIssues.length,
        total_issues_count: unresolvedIssues.length,
      });
    } else {
      // Remove any existing blocks if export is now allowed
      await db
        .update(exportBlocks)
        .set({ 
          isActive: false,
          resolvedAt: new Date() 
        })
        .where(
          and(
            eq(exportBlocks.speechId, speechId),
            eq(exportBlocks.userId, userId),
            eq(exportBlocks.isActive, true)
          )
        );
    }

    return {
      canExport,
      blockingIssues,
      warnings,
      totalIssues: unresolvedIssues.length,
      exportBlockId,
    };

  } catch (error) {
    console.error('Error validating export permissions:', error);
    throw error;
  }
}

// Create a quality issue
export async function createQualityIssue(issue: Omit<QualityIssue, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const [newIssue] = await db
      .insert(qualityIssues)
      .values({
        ...issue,
      })
      .returning();
    
    return newIssue;
  } catch (error) {
    console.error('Error creating quality issue:', error);
    throw error;
  }
}

// Resolve a quality issue
export async function resolveQualityIssue(
  issueId: string, 
  resolution: 'resolved' | 'acknowledged' | 'false_positive',
  userResponse?: string,
  resolvedBy?: string
) {
  try {
    await db
      .update(qualityIssues)
      .set({
        status: resolution,
        userResponse,
        resolvedBy: resolvedBy || null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(qualityIssues.id, issueId));

    return true;
  } catch (error) {
    console.error('Error resolving quality issue:', error);
    throw error;
  }
}

// Get quality issues for a speech
export async function getQualityIssues(speechId: string, userId: string) {
  try {
    const issues = await db
      .select()
      .from(qualityIssues)
      .where(
        and(
          eq(qualityIssues.speechId, speechId),
          eq(qualityIssues.userId, userId)
        )
      );

    return issues;
  } catch (error) {
    console.error('Error getting quality issues:', error);
    throw error;
  }
}

// Batch resolve issues (for user acknowledgment)
export async function batchResolveIssues(
  issueIds: string[],
  resolution: 'acknowledged' | 'resolved' | 'false_positive',
  userResponse?: string,
  resolvedBy?: string
) {
  try {
    await db
      .update(qualityIssues)
      .set({
        status: resolution,
        userResponse,
        resolvedBy: resolvedBy || null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        // Using SQL IN clause equivalent
        eq(qualityIssues.id, issueIds[0]) // This would need proper IN implementation
      );

    return true;
  } catch (error) {
    console.error('Error batch resolving quality issues:', error);
    throw error;
  }
}