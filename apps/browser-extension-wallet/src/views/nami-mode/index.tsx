import React, { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { useAppInit } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withDappContext } from '@src/features/dapp/context';
import { NamiView } from './NamiView';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { Crash } from '@components/Crash';
import { useFatalError } from '@hooks/useFatalError';

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
      document.querySelector('#preloader')?.remove();
    }
  }, [isLoaded, fatalError]);

  useAppInit();

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
