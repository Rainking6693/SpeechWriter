import { db } from '@speechwriter/database';
import { 
  modelRuns, 
  modelMetrics, 
  telemetryEvents, 
  speechAnalytics 
} from '@speechwriter/database/schema';
import { serverAnalytics } from './server';
import { ANALYTICS_EVENTS } from './config';

// Type definitions for better type safety
export interface ModelRunData {
  userId?: string;
  speechId?: string;
  provider: 'openai' | 'anthropic' | 'google' | 'cohere';
  model: string;
  stage: string;
  promptTemplate?: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface QualityMetric {
  modelRunId: string;
  metricName: string;
  value: number;
  unit?: string;
  threshold?: number;
  status: 'pass' | 'fail' | 'warning';
  notes?: string;
}

// Section 9.1 requirement: Store per-stage model_runs with tokens, latency, scores
export const trackModelRun = async (data: ModelRunData) => {
  try {
    const result = await db.insert(modelRuns).values({
      userId: data.userId || null,
      speechId: data.speechId || null,
      provider: data.provider,
      model: data.model,
      stage: data.stage,
      promptTemplate: data.promptTemplate,
      promptVersion: data.promptVersion,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      cost: data.cost,
      latencyMs: data.latencyMs,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    }).returning();

    const modelRun = result[0];

    // Track in PostHog for real-time analytics
    await serverAnalytics.track(
      data.userId || 'anonymous',
      ANALYTICS_EVENTS.MODEL_RUN_COMPLETED,
      {
        model_run_id: modelRun.id,
        provider: data.provider,
        model: data.model,
        stage: data.stage,
        tokens_used: data.totalTokens,
        latency_ms: data.latencyMs,
        cost_usd: data.cost,
        success: data.success,
      }
    );

    return modelRun;
  } catch (error) {
    console.error('Failed to track model run:', error);
    throw error;
  }
};

// Track quality metrics for model runs
export const trackQualityMetrics = async (metrics: QualityMetric[]) => {
  try {
    const result = await db.insert(modelMetrics).values(
      metrics.map(metric => ({
        modelRunId: metric.modelRunId,
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        threshold: metric.threshold,
        status: metric.status,
        notes: metric.notes,
      }))
    ).returning();

    // Track quality score events
    for (const metric of metrics) {
      await serverAnalytics.track(
        'system', // System event
        ANALYTICS_EVENTS.QUALITY_SCORE_CALCULATED,
        {
          model_run_id: metric.modelRunId,
          metric_name: metric.metricName,
          score: metric.value,
          status: metric.status,
        }
      );
    }

    return result;
  } catch (error) {
    console.error('Failed to track quality metrics:', error);
    throw error;
  }
};

// Section 9.1 requirement: Track drafts created, edit-burden, time-to-final
export const trackSpeechAnalytics = async (data: {
  speechId: string;
  userId: string;
  draftCreatedAt?: Date;
  firstEditAt?: Date;
  finalizedAt?: Date;
  editBurden?: number;
  humanizationPasses?: number;
  finalWordCount?: number;
  targetWordCount?: number;
  accuracyScore?: number;
  qualityScore?: number;
  userSatisfaction?: number;
  metadata?: Record<string, any>;
}) => {
  try {
    // Calculate time metrics
    let timeToFirstDraft: number | undefined;
    let timeToFinal: number | undefined;

    if (data.draftCreatedAt) {
      timeToFirstDraft = Math.floor(
        (data.draftCreatedAt.getTime() - new Date().getTime()) / 1000
      );
    }

    if (data.finalizedAt && data.draftCreatedAt) {
      timeToFinal = Math.floor(
        (data.finalizedAt.getTime() - data.draftCreatedAt.getTime()) / 1000
      );
    }

    const result = await db.insert(speechAnalytics).values({
      speechId: data.speechId,
      userId: data.userId,
      draftCreatedAt: data.draftCreatedAt,
      firstEditAt: data.firstEditAt,
      finalizedAt: data.finalizedAt,
      timeToFirstDraft,
      timeToFinal,
      editBurden: data.editBurden,
      humanizationPasses: data.humanizationPasses,
      finalWordCount: data.finalWordCount,
      targetWordCount: data.targetWordCount,
      accuracyScore: data.accuracyScore,
      qualityScore: data.qualityScore,
      userSatisfaction: data.userSatisfaction,
      metadata: data.metadata,
    }).returning();

    const analytics = result[0];

    // Track specific events as per project plan
    if (data.draftCreatedAt) {
      await serverAnalytics.track(data.userId, ANALYTICS_EVENTS.DRAFT_CREATED, {
        speech_id: data.speechId,
        time_to_draft: timeToFirstDraft,
        word_count: data.finalWordCount,
      });
    }

    if (data.editBurden !== undefined) {
      await serverAnalytics.track(data.userId, ANALYTICS_EVENTS.EDIT_BURDEN_RECORDED, {
        speech_id: data.speechId,
        edit_count: data.editBurden,
      });
    }

    if (timeToFinal !== undefined) {
      await serverAnalytics.track(data.userId, ANALYTICS_EVENTS.TIME_TO_FINAL_RECORDED, {
        speech_id: data.speechId,
        time_to_final: timeToFinal,
        quality_score: data.qualityScore,
      });
    }

    return analytics;
  } catch (error) {
    console.error('Failed to track speech analytics:', error);
    throw error;
  }
};

// Store telemetry events in database for audit and compliance
export const storeTelemetryEvent = async (data: {
  userId?: string;
  sessionId?: string;
  eventName: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
}) => {
  try {
    const result = await db.insert(telemetryEvents).values({
      userId: data.userId || null,
      sessionId: data.sessionId,
      eventName: data.eventName,
      properties: data.properties,
      context: data.context,
    }).returning();

    return result[0];
  } catch (error) {
    console.error('Failed to store telemetry event:', error);
    throw error;
  }
};