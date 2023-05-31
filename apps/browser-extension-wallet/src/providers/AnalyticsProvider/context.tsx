import React, { createContext, useContext, useMemo } from 'react';
import { AnalyticsTracker } from './analyticsTracker';
import { AnalyticsConsentStatus } from './analyticsTracker/types';
import { ANALYTICS_ACCEPTANCE_LS_KEY } from './analyticsTracker/config';
import { useWalletStore } from '@src/stores';
import { useLocalStorage } from '@src/hooks/useLocalStorage';

interface AnalyticsProviderProps {
  children: React.ReactNode;
  tracker?: AnalyticsTracker;
  featureEnabled?: boolean;
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
  featureEnabled = true
}: AnalyticsProviderProps): React.ReactElement => {
  const { currentChain } = useWalletStore();
  const [analyticsAccepted] = useLocalStorage(ANALYTICS_ACCEPTANCE_LS_KEY, AnalyticsConsentStatus.REJECTED);

  const analyticsTracker = useMemo(
    () => tracker || new AnalyticsTracker(currentChain, featureEnabled, analyticsAccepted),
    [tracker, currentChain, analyticsAccepted, featureEnabled]
  );

  return <AnalyticsContext.Provider value={analyticsTracker}>{children}</AnalyticsContext.Provider>;
};
