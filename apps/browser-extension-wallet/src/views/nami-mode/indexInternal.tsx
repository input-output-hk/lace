import React, { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiDappConnectorView } from './NamiDappConnectorView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';
import { useFatalError } from '@hooks/useFatalError';
import { Crash } from '@components/ErrorBoundary';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';

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

  if (fatalError) {
    return <Crash />;
  }

  return <div id="nami-mode">{isLoaded ? <NamiDappConnectorView /> : <MainLoader />}</div>;
});
