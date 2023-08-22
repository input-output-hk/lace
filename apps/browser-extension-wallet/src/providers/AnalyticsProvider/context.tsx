import { useLocalStorage } from '@src/hooks/useLocalStorage';
import { useWalletStore } from '@src/stores';
import debounce from 'lodash/debounce';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AnalyticsTracker } from './analyticsTracker';
import { EnhancedAnalyticsOptInStatus, ExtensionViews } from './analyticsTracker/types';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from './matomo/config';
import shallow from 'zustand/shallow';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';

interface AnalyticsProviderProps {
  children: React.ReactNode;
  tracker?: AnalyticsTracker;
  /**
   * feature toggle to turn off tracking completely (eg. for automated testing)
   */
  analyticsDisabled?: boolean;
}

const PAGE_VIEW_DEBOUNCE_DELAY = 100;

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
  const { currentChain, view } = useWalletStore(
    (state) => ({ currentChain: state?.currentChain, view: state.walletUI.appMode }),
    shallow
  );
  const [optedInForEnhancedAnalytics, { updateLocalStorage }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );
  const { listen } = useHistory();

  const analyticsTracker = useMemo(
    () =>
      tracker ||
      new AnalyticsTracker(
        { chain: currentChain, view: view === 'popup' ? ExtensionViews.Popup : ExtensionViews.Extended },
        analyticsDisabled
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker, analyticsDisabled]
  );

  useEffect(() => {
    const unregisterListener = listen((location) => {
      if (walletRoutePaths.setup.home === location.pathname) {
        updateLocalStorage(EnhancedAnalyticsOptInStatus.OptedOut);
      }
    });

    return () => unregisterListener();
  }, [listen, updateLocalStorage]);

  useEffect(() => {
    analyticsTracker.setOptedInForEnhancedAnalytics(optedInForEnhancedAnalytics);
  }, [optedInForEnhancedAnalytics, analyticsTracker]);
  useEffect(() => {
    analyticsTracker.setChain(currentChain);
  }, [currentChain, analyticsTracker]);

  // Track page changes with PostHog in order to keep the user session alive
  useEffect(() => {
    const trackActivePageChange = debounce(() => analyticsTracker.sendPageNavigationEvent(), PAGE_VIEW_DEBOUNCE_DELAY);

    window.addEventListener('popstate', trackActivePageChange);
    return () => {
      window.removeEventListener('popstate', trackActivePageChange);
    };
  }, [analyticsTracker]);

  return <AnalyticsContext.Provider value={analyticsTracker}>{children}</AnalyticsContext.Provider>;
};
