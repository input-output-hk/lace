import React, { useEffect, useMemo } from 'react';
import { ExtensionRoutes } from './ExtensionRoutes';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useWalletStore } from '@stores';
import { UnlockWalletContainer } from '@src/features/unlock-wallet';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';
import { useEnterKeyPress } from '@hooks/useEnterKeyPress';
import { getValueFromLocalStorage } from '@src/utils/local-storage';
import { MainLoader } from '@components/MainLoader';
import { useAppInit } from '@hooks';
import { ILocalStorage } from '@src/types';
import { useFatalError } from '@hooks/useFatalError';
import { Crash } from '@components/Crash';

dayjs.extend(duration);

const isLastValidationExpired = (lastVerification: string, frequency: string): boolean => {
  const lastValidationDate = dayjs(Number(lastVerification));
  const expirationDate = lastValidationDate.add(dayjs.duration({ days: Number(frequency) }));
  return expirationDate.isBefore(dayjs());
};

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place [LW-5341]
export const PopupView = (): React.ReactElement => {
  const {
    cardanoWallet,
    inMemoryWallet,
    currentChain,
    walletInfo,
    isWalletLocked,
    walletLock,
    walletState,
    initialHdDiscoveryCompleted
  } = useWalletStore();

  const [{ lastMnemonicVerification, mnemonicVerificationFrequency, chainName }] = useAppSettingsContext();
  const backgroundServices = useBackgroundServiceAPIContext();

  useAppInit();
  useEnterKeyPress();

  useEffect(() => {
    // try to get wallet data from storage if exist and initialize state
    // if no wallet is found and the wallet is not locked open setup flow
    // all the related data is cleared for the forgot password flow as well, so do not react in this case
    const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>(
      'isForgotPasswordFlow'
    );
    if (cardanoWallet === null && !isWalletLocked() && !isForgotPasswordFlow) {
      backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME }).then(() => window.close());
    }
    // TODO: Revise network switching with address discovery and refactor to make the process easier to maintain
    // chainName is not being used but it's needed here for this to work like the browser view when switching networks
    // (see useEffect in browser-view routes index)
  }, [isWalletLocked, backgroundServices, currentChain, chainName, cardanoWallet]);

  const fatalError = useFatalError();
  const isLoaded = useMemo(
    () => !!cardanoWallet && walletInfo && walletState && inMemoryWallet && initialHdDiscoveryCompleted,
    [cardanoWallet, walletInfo, walletState, inMemoryWallet, initialHdDiscoveryCompleted]
  );
  useEffect(() => {
    if (isLoaded || fatalError) {
      document.querySelector('#preloader')?.remove();
    }
  }, [isLoaded, fatalError]);

  const checkMnemonicVerificationFrequency = () =>
    mnemonicVerificationFrequency && isLastValidationExpired(lastMnemonicVerification, mnemonicVerificationFrequency);

  if (fatalError) {
    return <Crash />;
  }

  if (checkMnemonicVerificationFrequency() && walletLock) {
    return <UnlockWalletContainer validateMnemonic />;
  }

  // Locked
  if (isWalletLocked()) {
    return <UnlockWalletContainer />;
  }

  if (isLoaded) {
    return <ExtensionRoutes />;
  }

  return <MainLoader />;
};
