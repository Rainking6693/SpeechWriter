import { PostHog } from 'posthog-node';
import { ANALYTICS_CONFIG, AnalyticsEvent } from './config';

// Server-side PostHog instance
let serverPosthog: PostHog | null = null;

// Initialize server-side analytics
export const initServerAnalytics = () => {
  if (ANALYTICS_CONFIG.enabled && ANALYTICS_CONFIG.serverPosthogKey) {
    if (!serverPosthog) {
      serverPosthog = new PostHog(ANALYTICS_CONFIG.serverPosthogKey, {
        host: ANALYTICS_CONFIG.posthogHost,
      });
    }
  }
  return serverPosthog;
};

// Server-side analytics interface
export const serverAnalytics = {
  // Track events from server-side (API functions, background jobs)
  track: async (
    userId: string | null,
    event: AnalyticsEvent,
    properties?: Record<string, any>
  ) => {
    const posthog = initServerAnalytics();
    if (posthog && userId) {
      await posthog.capture({
        distinctId: userId,
        event,
        properties,
      });
    }
  },

  // Identify user server-side
  identify: async (userId: string, traits?: Record<string, any>) => {
    const posthog = initServerAnalytics();
    if (posthog) {
      await posthog.identify({
        distinctId: userId,
        properties: traits,
      });
    }
  },

  // Flush events (useful for serverless functions)
  flush: async () => {
    const posthog = initServerAnalytics();
    if (posthog) {
      await posthog.flush();
    }
  },

  // Shutdown (cleanup)
  shutdown: async () => {
    const posthog = initServerAnalytics();
    if (posthog) {
      await posthog.shutdown();
    }
  },
};

export default serverAnalytics;