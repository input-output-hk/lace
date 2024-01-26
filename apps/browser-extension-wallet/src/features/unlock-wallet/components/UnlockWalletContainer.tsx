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

export interface UnlockWalletContainerProps {
  validateMnemonic?: boolean;
}

export const UnlockWalletContainer = ({ validateMnemonic }: UnlockWalletContainerProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { unlockWallet, lockWallet, deleteWallet } = useWalletManager();
  const { setDeletingWallet, resetWalletLock, setAddressesDiscoveryCompleted } = useWalletStore();
  const backgroundService = useBackgroundServiceAPIContext();

  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setUnlocked] = useState<boolean>();

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
        setUnlocked(true);
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
    setDeletingWallet(true);
    await deleteWallet(true);
    await backgroundService.handleOpenBrowser({ section: BrowserViewSections.FORGOT_PASSWORD });
    setDeletingWallet(false);
  };

  useKeyboardShortcut(['Enter'], onUnlock);

  // LW-9500
  // Setting this will trigger the wallet loading in PopupView
  // const loadWallet = useCallback(async () => {
  //   unlocked;
  // if (unlocked) {
  //   const keyAgentData = unlocked[environmentName]?.keyAgentData;
  //   // eslint-disable-next-line unicorn/no-null
  //   saveValueInLocalStorage({ key: 'keyAgentData', value: keyAgentData ?? null });
  //   await backgroundService.setBackgroundStorage({ keyAgentsByChain: unlocked });
  //   setKeyAgentData(keyAgentData);
  // }
  // }, [unlocked]);
  // return validateMnemonic && unlocked ? (
  //   <MnemonicValidation publicKey={getPublicKey(cardanoWallet.source.wallet)} onValidationSuccess={loadWallet} />
  // ) : (

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
