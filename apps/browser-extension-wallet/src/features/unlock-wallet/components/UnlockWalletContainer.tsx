import React, { useCallback, useEffect, useState } from 'react';
import { UnlockWallet } from './UnlockWallet';
import { useWalletManager } from '@src/hooks/useWalletManager';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { saveValueInLocalStorage } from '@src/utils/local-storage';
import { useKeyboardShortcut } from '@lace/common';
import { BrowserViewSections } from '@lib/scripts/types';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { getChainName } from '@src/utils/get-chain-name';

export interface UnlockWalletContainerProps {
  validateMnemonic?: boolean;
}

export const UnlockWalletContainer = ({ validateMnemonic }: UnlockWalletContainerProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { unlockWallet, lockWallet, deleteWallet } = useWalletManager();
  const { setDeletingWallet, resetWalletLock, setAddressesDiscoveryCompleted, currentChain } = useWalletStore();
  const backgroundService = useBackgroundServiceAPIContext();

  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);

  const handlePasswordChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      if (!isValidPassword) {
        setIsValidPassword(true);
      }
      setPassword(value);
    },
    [isValidPassword]
  );

  useEffect(() => {
    // Force lock when has to validate mnemonic
    if (validateMnemonic) lockWallet();
  }, [lockWallet, validateMnemonic]);

  const onUnlock = async (): Promise<void> => {
    setIsVerifyingPassword(true);
    try {
      const decrypted = await unlockWallet(password);
      setIsValidPassword(decrypted);
      analytics.sendEventToPostHog(PostHogAction.UnlockWalletWelcomeBackUnlockClick);
      if (decrypted) {
        setAddressesDiscoveryCompleted(true);
        resetWalletLock();
      }
    } catch {
      setIsValidPassword(false);
    }
    setIsVerifyingPassword(false);
  };

  const onForgotPasswordClick = async (): Promise<void> => {
    await analytics.sendEventToPostHog(PostHogAction.UnlockWalletForgotPasswordProceedClick);
    saveValueInLocalStorage({ key: 'isForgotPasswordFlow', value: true });
    saveValueInLocalStorage({ key: 'appSettings', value: { chainName: getChainName(currentChain) } });
    setDeletingWallet(true);
    await deleteWallet(true);
    await backgroundService.handleOpenBrowser({ section: BrowserViewSections.FORGOT_PASSWORD });
    setDeletingWallet(false);
  };

  useKeyboardShortcut(['Enter'], onUnlock);

  return (
    <UnlockWallet
      isLoading={isVerifyingPassword}
      onUnlock={onUnlock}
      passwordInput={{ value: password, handleChange: handlePasswordChange, invalidPass: !isValidPassword }}
      unlockButtonDisabled={password === ''}
      onForgotPasswordClick={onForgotPasswordClick}
    />
  );
};
