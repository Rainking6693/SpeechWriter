'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initAnalytics, clientAnalytics, AnalyticsEvent } from '@speechwriter/analytics';
import { useSession } from 'next-auth/react';

interface AnalyticsContextType {
  track: (event: AnalyticsEvent, properties?: Record<string, any>) => void;
  page: (name?: string, properties?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  track: () => {},
  page: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { data: session } = useSession();

  useEffect(() => {
    // Initialize PostHog
    initAnalytics();

    // Identify user when session is available
    if (session?.user?.id) {
      clientAnalytics.identify(session.user.id, {
        plan: session.user.subscriptionPlan || 'free',
        // Only include non-PII traits
        created_at: session.user.createdAt,
      });
    }

    // Reset analytics when user logs out
    if (!session) {
      clientAnalytics.reset();
    }
  }, [session]);

  const track = (event: AnalyticsEvent, properties?: Record<string, any>) => {
    const eventProperties = {
      ...properties,
      user_id: session?.user?.id,
      subscription_plan: session?.user?.subscriptionPlan || 'free',
      timestamp: new Date().toISOString(),
    };

    clientAnalytics.track(event, eventProperties);
  };

  const page = (name?: string, properties?: Record<string, any>) => {
    const pageProperties = {
      ...properties,
      user_id: session?.user?.id,
      subscription_plan: session?.user?.subscriptionPlan || 'free',
    };

    clientAnalytics.page(name, pageProperties);
  };

  return (
    <AnalyticsContext.Provider value={{ track, page }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export default AnalyticsProvider;