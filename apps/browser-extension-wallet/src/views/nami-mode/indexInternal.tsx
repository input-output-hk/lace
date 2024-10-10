import React from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiDappConnectorView } from './NamiDappConnectorView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';

export const NamiDappConnector = withDappContext((): React.ReactElement => {
  const { hdDiscoveryStatus } = useWalletStore();

  useAppInit();

  return <div id="nami-mode">{hdDiscoveryStatus === 'Idle' ? <NamiDappConnectorView /> : <MainLoader />}</div>;
});
