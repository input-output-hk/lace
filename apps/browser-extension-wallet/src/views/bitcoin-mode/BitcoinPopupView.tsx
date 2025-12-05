/* eslint-disable promise/catch-or-return */
import React, { useEffect, useMemo, useState } from 'react';
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
import { useAppInit, useLocalStorage, useWalletManager } from '@hooks';
import { ILocalStorage } from '@src/types';
import { useFatalError } from '@hooks/useFatalError';
import { Crash } from '@components/ErrorBoundary';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';

dayjs.extend(duration);

const isLastValidationExpired = (lastVerification: string, frequency: string): boolean => {
  const lastValidationDate = dayjs(Number(lastVerification));
  const expirationDate = lastValidationDate.add(dayjs.duration({ days: Number(frequency) }));
  return expirationDate.isBefore(dayjs());
};

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place [LW-5341]
export const BitcoinPopupView = (): React.ReactElement => {
  const { isWalletLocked, walletLock, walletDisplayInfo } = useWalletStore();
  const { getActiveWalletId } = useWalletManager();
  const [activeWalletId, setActiveWalletId] = useState<string>('');

  const [{ lastMnemonicVerification, mnemonicVerificationFrequency }] = useAppSettingsContext();
  const backgroundServices = useBackgroundServiceAPIContext();

  useAppInit();
  useEnterKeyPress();

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

  useEffect(() => {
    if (enhancedAnalyticsStatus !== EnhancedAnalyticsOptInStatus.OptedIn) {
      setDoesUserAllowAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      analytics.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
    }
  }, [analytics, enhancedAnalyticsStatus, setDoesUserAllowAnalytics]);

  useEffect(() => {
    getActiveWalletId().then((id) => {
      setActiveWalletId(id);

      // try to get wallet data from storage if exist and initialize state
      // if no wallet is found and the wallet is not locked open setup flow
      // all the related data is cleared for the forgot password flow as well, so do not react in this case
      const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>(
        'isForgotPasswordFlow'
      );
      if (!id && !isWalletLocked() && !isForgotPasswordFlow) {
        backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME });
      }
    });
  }, [getActiveWalletId, backgroundServices, isWalletLocked]);

  const fatalError = useFatalError();
  const isLoaded = useMemo(() => activeWalletId !== '' && !!walletDisplayInfo, [walletDisplayInfo, activeWalletId]);
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
