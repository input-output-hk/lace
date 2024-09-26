import React from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiView } from './NamiView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';

export const NamiPopup = withDappContext((): React.ReactElement => {
  const { inMemoryWallet, walletInfo, cardanoWallet, walletState, initialHdDiscoveryCompleted, currentChain } =
    useWalletStore();

  useAppInit();

  return (
    <div id="nami-mode">
      {!!cardanoWallet && walletInfo && walletState && inMemoryWallet && initialHdDiscoveryCompleted && currentChain ? (
        <NamiView />
      ) : (
        <MainLoader />
      )}
    </div>
  );
});
