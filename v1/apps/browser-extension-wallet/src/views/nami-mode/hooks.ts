import { useCallback } from 'react';
import { useAnalyticsContext } from '@providers';
import { Action, PostHogProperties } from '@providers/AnalyticsProvider/analyticsTracker';

export const useAnalytics = (): {
  isAnalyticsOptIn: boolean;
  sendEventToPostHog: (action: Action, properties?: PostHogProperties) => Promise<void>;
} => {
  const analytics = useAnalyticsContext();
  const sendEventToPostHog = useCallback(
    (action: Action, properties?: PostHogProperties) => analytics.sendEventToPostHog(action, properties),
    [analytics]
  );

  return { isAnalyticsOptIn: true, sendEventToPostHog };
};
