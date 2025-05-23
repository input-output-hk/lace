import React, { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit, useLocalStorage } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiDappConnectorView } from './NamiDappConnectorView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';
import { useFatalError } from '@hooks/useFatalError';
import { Crash } from '@components/ErrorBoundary';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';

export const NamiDappConnector = withDappContext((): React.ReactElement => {
  const { hdDiscoveryStatus } = useWalletStore();
  const isLoaded = useMemo(() => hdDiscoveryStatus === 'Idle', [hdDiscoveryStatus]);

  const fatalError = useFatalError();
  useEffect(() => {
    if (isLoaded) {
      removePreloaderIfExists();
    }
  }, [isLoaded]);

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

  if (fatalError) {
    return <Crash />;
  }

  return <div id="nami-mode">{isLoaded ? <NamiDappConnectorView /> : <MainLoader />}</div>;
});
