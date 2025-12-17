import { useWalletStore } from '@src/stores';
import debounce from 'lodash/debounce';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AnalyticsTracker } from './analyticsTracker';
import { ExtensionViews } from './analyticsTracker/types';
import shallow from 'zustand/shallow';
import { POSTHOG_EXCLUDED_EVENTS } from '@providers/PostHogClientProvider/client';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import {
  createConfirmedTransactionsObservable,
  getUnconfirmedTransactions,
  saveUnconfirmedTransactions,
  sendConfirmedTransactionAnalytics,
  useOnChainEventAnalytics
} from './onChain';

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
  const { currentChain, view, inMemoryWallet } = useWalletStore(
    (state) => ({
      currentChain: state?.currentChain,
      view: state.walletUI.appMode,
      inMemoryWallet: state.inMemoryWallet
    }),
    shallow
  );
  const postHogClient = usePostHogClientContext();

  const analyticsTracker = useMemo(
    () =>
      tracker ||
      new AnalyticsTracker({
        postHogClient,
        view: view === 'popup' ? ExtensionViews.Popup : ExtensionViews.Extended,
        analyticsDisabled,
        excludedEvents: POSTHOG_EXCLUDED_EVENTS
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker, analyticsDisabled, postHogClient]
  );

  useEffect(() => {
    analyticsTracker.setChain(currentChain);
  }, [currentChain, analyticsTracker]);

  // Track page changes with PostHog in order to keep the user session alive
  useEffect(() => {
    const trackActivePageChange = debounce(() => analyticsTracker.sendPageNavigationEvent(), PAGE_VIEW_DEBOUNCE_DELAY);
    window.addEventListener('load', trackActivePageChange);
    window.addEventListener('popstate', trackActivePageChange);
    return () => {
      window.removeEventListener('load', trackActivePageChange);
      window.removeEventListener('popstate', trackActivePageChange);
    };
  }, [analyticsTracker]);

  useOnChainEventAnalytics({
    observable$: createConfirmedTransactionsObservable(inMemoryWallet),
    onChainEvent: (onChainTransactionIds) =>
      sendConfirmedTransactionAnalytics({
        onChainTransactionIds,
        sendEventToPostHog: analyticsTracker?.sendEventToPostHog.bind(analyticsTracker),
        getUnconfirmedTransactionsFn: getUnconfirmedTransactions,
        saveUnconfirmedTransactionsFn: saveUnconfirmedTransactions
      })
  });

  return <AnalyticsContext.Provider value={analyticsTracker}>{children}</AnalyticsContext.Provider>;
};
