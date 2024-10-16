import React, { useEffect } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiView } from './NamiView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';

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

  useAppInit();

  useEffect(() => {
    if (cardanoWallet === null && !deletingWallet) {
      backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME });
    }
  }, [backgroundServices, cardanoWallet, deletingWallet]);

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
