import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AnalyticsTracker } from './analyticsTracker';
import { EnhancedAnalyticsOptInStatus } from './analyticsTracker/types';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from './matomo/config';
import { useWalletStore } from '@src/stores';
import { useLocalStorage } from '@src/hooks/useLocalStorage';

interface AnalyticsProviderProps {
  children: React.ReactNode;
  tracker?: AnalyticsTracker;
  /**
   * feature toggle to turn off tracking completely (eg. for automated testing)
   */
  trackingDisabled?: boolean;
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
  trackingDisabled
}: AnalyticsProviderProps): React.ReactElement => {
  const { currentChain } = useWalletStore();
  const [optedInForEnhancedTracking] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const analyticsTracker = useMemo(
    () => tracker || new AnalyticsTracker(currentChain, trackingDisabled, optedInForEnhancedTracking),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker, trackingDisabled]
  );

  useEffect(() => {
    analyticsTracker.setOptedInForEnhancedTracking(optedInForEnhancedTracking);
  }, [optedInForEnhancedTracking, analyticsTracker]);

  useEffect(() => {
    analyticsTracker.setSiteId(currentChain);
  }, [currentChain, analyticsTracker]);

  return <AnalyticsContext.Provider value={analyticsTracker}>{children}</AnalyticsContext.Provider>;
};
