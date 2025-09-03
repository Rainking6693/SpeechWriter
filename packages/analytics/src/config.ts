// PostHog configuration for SpeechWriter analytics
export const ANALYTICS_CONFIG = {
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  // Server-side PostHog key for API functions
  serverPosthogKey: process.env.POSTHOG_SERVER_KEY || '',
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_ANALYTICS === 'true',
} as const;

// Analytics event names following the project plan requirements
export const ANALYTICS_EVENTS = {
  // Section 9.1 - Core telemetry events
  DRAFT_CREATED: 'draft_created',
  EDIT_BURDEN_RECORDED: 'edit_burden_recorded',
  TIME_TO_FINAL_RECORDED: 'time_to_final_recorded',
  
  // User journey events
  SPEECH_BRIEF_CREATED: 'speech_brief_created',
  OUTLINE_GENERATED: 'outline_generated',
  DRAFT_GENERATED: 'draft_generated',
  HUMANIZATION_STARTED: 'humanization_started',
  HUMANIZATION_COMPLETED: 'humanization_completed',
  
  // Quality and performance events
  MODEL_RUN_COMPLETED: 'model_run_completed',
  QUALITY_SCORE_CALCULATED: 'quality_score_calculated',
  CLICHE_SCAN_COMPLETED: 'cliche_scan_completed',
  FACT_CHECK_COMPLETED: 'fact_check_completed',
  
  // Export and sharing events
  EXPORT_REQUESTED: 'export_requested',
  EXPORT_BLOCKED: 'export_blocked', // For section 9.2 - quality gates
  EXPORT_COMPLETED: 'export_completed',
  SPEECH_SHARED: 'speech_shared',
  
  // User engagement events
  REHEARSAL_STARTED: 'rehearsal_started',
  REHEARSAL_COMPLETED: 'rehearsal_completed',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];