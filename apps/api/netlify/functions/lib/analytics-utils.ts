import { serverAnalytics, trackModelRun, ANALYTICS_EVENTS } from '@speechwriter/analytics';

// Utility to wrap OpenAI calls with analytics tracking
export async function trackOpenAICall<T>(
  operation: () => Promise<T>,
  params: {
    userId: string;
    speechId: string;
    stage: string;
    model: string;
    promptTemplate?: string;
    estimatedInputTokens?: number;
  }
): Promise<{ result: T; modelRunId: string }> {
  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;
  let result: T;

  try {
    result = await operation();
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    try {
      // Track the model run in database
      const modelRun = await trackModelRun({
        userId: params.userId,
        speechId: params.speechId,
        provider: 'openai',
        model: params.model,
        stage: params.stage,
        promptTemplate: params.promptTemplate,
        inputTokens: params.estimatedInputTokens,
        // For streaming responses, we can't get exact token counts here
        // They should be updated later when the response is complete
        latencyMs,
        success,
        errorMessage,
        metadata: {
          timestamp: new Date().toISOString(),
          stage: params.stage,
        },
      });

      // Track analytics event
      await serverAnalytics.track(
        params.userId,
        ANALYTICS_EVENTS.MODEL_RUN_COMPLETED,
        {
          model_run_id: modelRun.id,
          provider: 'openai',
          model: params.model,
          stage: params.stage,
          latency_ms: latencyMs,
          success,
          error_message: errorMessage,
        }
      );

      return { result: result!, modelRunId: modelRun.id };
    } catch (analyticsError) {
      console.error('Failed to track model run analytics:', analyticsError);
      // Don't fail the main operation due to analytics errors
      return { result: result!, modelRunId: 'failed-to-track' };
    }
  }
}

// Utility to estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 0.75 words for English
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / 0.75);
}

// Track speech analytics events
export async function trackSpeechEvent(
  userId: string,
  speechId: string,
  event: string,
  properties?: Record<string, any>
) {
  try {
    await serverAnalytics.track(userId, event as any, {
      speech_id: speechId,
      ...properties,
    });
  } catch (error) {
    console.error('Failed to track speech event:', error);
  }
}