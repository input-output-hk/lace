import React, { useEffect } from 'react';
import { ExtensionRoutes } from './ExtensionRoutes';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useWalletStore } from '@stores';
import { UnlockWalletContainer } from '@src/features/unlock-wallet';
import { lockWalletSelector } from '@src/features/unlock-wallet/selectors';
import { useWalletManager } from '@src/hooks/useWalletManager';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';
import { useEnterKeyPress } from '@hooks/useEnterKeyPress';
import { getValueFromLocalStorage } from '@src/utils/local-storage';
import { MainLoader } from '@components/MainLoader';
import { useAppInit } from '@hooks';
import { ILocalStorage } from '@src/types';

dayjs.extend(duration);

const isLastValidationExpired = (lastVerification: string, frequency: string): boolean => {
  const lastValidationDate = dayjs(Number(lastVerification));
  const expirationDate = lastValidationDate.add(dayjs.duration({ days: Number(frequency) }));
  return expirationDate.isBefore(dayjs());
};

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place [LW-5341]
export const PopupView = (): React.ReactElement => {
  const [{ lastMnemonicVerification, mnemonicVerificationFrequency }] = useAppSettingsContext();
  const { inMemoryWallet, keyAgentData, currentChain, walletInfo, setKeyAgentData, addressesDiscoveryCompleted } =
    useWalletStore();
  const { isWalletLocked, walletLock } = useWalletStore(lockWalletSelector);
  const { loadWallet } = useWalletManager();
  const backgroundServices = useBackgroundServiceAPIContext();

  useAppInit();
  useEnterKeyPress();

  useEffect(() => {
    const load = async () => {
      // try to get key agent data from local storage if exist and initialize state
      // if no key agent and the wallet is not locked open setup flow
      const keyAgentFromStorage = getValueFromLocalStorage('keyAgentData');
      // all the related data is cleared for the forgot password flow as well, so do not react in this case
      const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>(
        'isForgotPasswordFlow'
      );
      if (!keyAgentFromStorage && !isWalletLocked() && !isForgotPasswordFlow) {
        await backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME });
      } else {
        setKeyAgentData(keyAgentFromStorage);
      }
    };
    load();
  }, [isWalletLocked, backgroundServices, currentChain, setKeyAgentData]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const checkMnemonicVerificationFrequency = () =>
    mnemonicVerificationFrequency && isLastValidationExpired(lastMnemonicVerification, mnemonicVerificationFrequency);

  if (checkMnemonicVerificationFrequency() && walletLock) {
    return <UnlockWalletContainer validateMnemonic />;
  }

  // Locked
  if (isWalletLocked()) {
    return <UnlockWalletContainer />;
  }

  // Wallet loaded
  if (keyAgentData && walletInfo && inMemoryWallet && addressesDiscoveryCompleted) {
    return <ExtensionRoutes />;
  }

  return <MainLoader />;
};
