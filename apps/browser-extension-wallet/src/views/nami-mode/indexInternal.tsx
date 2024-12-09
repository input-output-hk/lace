import React, { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiDappConnectorView } from './NamiDappConnectorView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';

export const NamiDappConnector = withDappContext((): React.ReactElement => {
  const { hdDiscoveryStatus } = useWalletStore();
  const isLoaded = useMemo(() => hdDiscoveryStatus === 'Idle', [hdDiscoveryStatus]);
  useEffect(() => {
    if (isLoaded) {
      document.querySelector('#preloader')?.remove();
    }
  }, [isLoaded]);

  useAppInit();

  return <div id="nami-mode">{isLoaded ? <NamiDappConnectorView /> : <MainLoader />}</div>;
});
