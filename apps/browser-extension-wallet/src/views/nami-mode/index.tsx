import React, { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit, useLocalStorage } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiView } from './NamiView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';
import { useAnalyticsContext, useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { Crash } from '@components/ErrorBoundary';
import { useFatalError } from '@hooks/useFatalError';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';

export const NamiPopup = withDappContext((): React.ReactElement => {
  const {
    inMemoryWallet,
    walletInfo,
    cardanoWallet,
    walletState,
    initialHdDiscoveryCompleted,
    currentChain,
    deletingWallet
  } = useWalletStore();
  const backgroundServices = useBackgroundServiceAPIContext();
  const isLoaded = useMemo(
    () => !!cardanoWallet && walletInfo && walletState && inMemoryWallet && initialHdDiscoveryCompleted && currentChain,
    [cardanoWallet, walletInfo, walletState, inMemoryWallet, initialHdDiscoveryCompleted, currentChain]
  );

  const fatalError = useFatalError();
  useEffect(() => {
    if (isLoaded || fatalError) {
      removePreloaderIfExists();
    }
  }, [isLoaded, fatalError]);

  useAppInit();

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

  useEffect(() => {
    if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet) {
      setDoesUserAllowAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      analytics.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
    }
  }, [analytics, enhancedAnalyticsStatus, setDoesUserAllowAnalytics]);

  useEffect(() => {
    if (cardanoWallet === null && !deletingWallet) {
      backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME });
    }
  }, [backgroundServices, cardanoWallet, deletingWallet]);

  if (fatalError) {
    return <Crash />;
  }

  return <div id="nami-mode">{isLoaded ? <NamiView /> : <MainLoader />}</div>;
});
