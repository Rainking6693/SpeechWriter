import posthog from 'posthog-js';
import { ANALYTICS_CONFIG, AnalyticsEvent } from './config';

// Initialize PostHog client for browser usage
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && ANALYTICS_CONFIG.enabled && ANALYTICS_CONFIG.posthogKey) {
    posthog.init(ANALYTICS_CONFIG.posthogKey, {
      api_host: ANALYTICS_CONFIG.posthogHost,
      // Privacy-first configuration
      autocapture: false, // Disable automatic event capture for privacy
      disable_session_recording: true, // Disable session recordings for privacy
      sanitize_properties: (properties) => {
        // Remove any PII from properties
        const sanitized = { ...properties };
        delete sanitized.email;
        delete sanitized.name;
        delete sanitized.phone;
        return sanitized;
      },
      person_profiles: 'identified_only', // Only track identified users
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug(true);
        }
      },
    });
  }
};

// Client-side analytics interface
export const analytics = {
  // Track events with privacy-first approach
  track: (event: AnalyticsEvent, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && ANALYTICS_CONFIG.enabled) {
      posthog.capture(event, properties);
    }
  },

  // Identify user (only with consent and minimal data)
  identify: (userId: string, traits?: Record<string, any>) => {
    if (typeof window !== 'undefined' && ANALYTICS_CONFIG.enabled) {
      const sanitizedTraits = traits ? { ...traits } : {};
      // Remove PII from traits
      delete sanitizedTraits.email;
      delete sanitizedTraits.name;
      delete sanitizedTraits.phone;
      
      posthog.identify(userId, sanitizedTraits);
    }
  },

  // Reset user data (for logout)
  reset: () => {
    if (typeof window !== 'undefined' && ANALYTICS_CONFIG.enabled) {
      posthog.reset();
    }
  },

  // Page view tracking
  page: (name?: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && ANALYTICS_CONFIG.enabled) {
      posthog.capture('$pageview', {
        ...properties,
        $current_url: window.location.href,
        page_name: name,
      });
    }
  },
};

export default analytics;