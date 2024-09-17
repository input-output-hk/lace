import { useCallback } from 'react';
import { useLocalStorage } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { Action, EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';

export const useAnalytics = (): {
  isAnalyticsOptIn: boolean;
  sendEventToPostHog: (action: Action) => Promise<void>;
  handleAnalyticsChoice: (isOptedIn: boolean) => Promise<void>;
} => {
  const analytics = useAnalyticsContext();
  const sendEventToPostHog = useCallback((action: Action) => analytics.sendEventToPostHog(action), [analytics]);
  const [analyticsStatus, { updateLocalStorage: setEnhancedAnalyticsOptInStatus }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );
  const isAnalyticsOptIn = analyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn;
  const handleAnalyticsChoice = useCallback(
    async (isOptedIn: boolean) => {
      const status = isOptedIn ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut;

      if (isOptedIn) {
        await analytics.setOptedInForEnhancedAnalytics(status);
        await analytics.sendAliasEvent();
      } else {
        await analytics.setOptedInForEnhancedAnalytics(status);
      }
      setEnhancedAnalyticsOptInStatus(status);
    },
    [analytics, setEnhancedAnalyticsOptInStatus]
  );

  return { isAnalyticsOptIn, sendEventToPostHog, handleAnalyticsChoice };
};
