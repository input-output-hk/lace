import { useLocalStorage } from '@src/hooks/useLocalStorage';
import { useWalletStore } from '@src/stores';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AnalyticsTracker, PostHogAction } from './analyticsTracker';
import { EnhancedAnalyticsOptInStatus } from './analyticsTracker/types';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from './matomo/config';

interface AnalyticsProviderProps {
  children: React.ReactNode;
  tracker?: AnalyticsTracker;
  /**
   * feature toggle to turn off tracking completely (eg. for automated testing)
   */
  analyticsDisabled?: boolean;
}

type AnalyticsTrackerInstance = AnalyticsTracker;

// eslint-disable-next-line unicorn/no-null
const AnalyticsContext = createContext<AnalyticsTracker | null>(null);

export const useAnalyticsContext = (): AnalyticsTrackerInstance => {
  const analyticsContext = useContext(AnalyticsContext);
  if (analyticsContext === null) throw new Error('context not defined');
  return analyticsContext;
};

export const AnalyticsProvider = ({
  children,
  tracker,
  analyticsDisabled
}: AnalyticsProviderProps): React.ReactElement => {
  const { currentChain } = useWalletStore();
  const [optedInForEnhancedAnalytics] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const analyticsTracker = useMemo(
    () => tracker || new AnalyticsTracker(currentChain, analyticsDisabled, optedInForEnhancedAnalytics),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker, analyticsDisabled]
  );

  useEffect(() => {
    analyticsTracker.setOptedInForEnhancedAnalytics(optedInForEnhancedAnalytics);
  }, [optedInForEnhancedAnalytics, analyticsTracker]);

  useEffect(() => {
    analyticsTracker.setChain(currentChain);
  }, [currentChain, analyticsTracker]);

  useEffect(() => {
    const trackActivePageChange = () => analyticsTracker.sendEventToPostHog(PostHogAction.WalletChangeActivePage);
    window.addEventListener('popstate', trackActivePageChange);
    return () => {
      window.removeEventListener('popstate', trackActivePageChange);
    };
  }, [analyticsTracker]);

  return <AnalyticsContext.Provider value={analyticsTracker}>{children}</AnalyticsContext.Provider>;
};
