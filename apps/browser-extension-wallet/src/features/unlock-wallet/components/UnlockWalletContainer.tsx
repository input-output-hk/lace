import React, { useCallback, useEffect, useState } from 'react';
import { UnlockWallet } from './UnlockWallet';
import { MnemonicValidation } from './MnemonicValidation';
import { useWalletManager } from '@src/hooks/useWalletManager';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { Wallet } from '@src/../../../packages/cardano/dist';
import { saveValueInLocalStorage } from '@src/utils/local-storage';
import { useKeyboardShortcut } from '@lace/common';
import { BrowserViewSections } from '@lib/scripts/types';

export interface UnlockWalletContainerProps {
  validateMnemonic?: boolean;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export const UnlockWalletContainer = ({ validateMnemonic }: UnlockWalletContainerProps): React.ReactElement => {
  const { unlockWallet, lockWallet, deleteWallet } = useWalletManager();
  const { environmentName, setKeyAgentData } = useWalletStore();
  const backgroundService = useBackgroundServiceAPIContext();

  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [unlocked, setUnlocked] = useState<Wallet.KeyAgentsByChain | void>();

  // Setting this will trigger the wallet loading in PopupView
  const loadWallet = useCallback(async () => {
    if (unlocked) {
      const keyAgentData = unlocked[environmentName]?.keyAgentData;
      // eslint-disable-next-line unicorn/no-null
      saveValueInLocalStorage({ key: 'keyAgentData', value: keyAgentData ?? null });
      await backgroundService.setBackgroundStorage({ keyAgentsByChain: unlocked });
      setKeyAgentData(keyAgentData);
    }
  }, [backgroundService, environmentName, setKeyAgentData, unlocked]);

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

  useEffect(() => {
    if (!validateMnemonic && unlocked) {
      loadWallet();
    }
  }, [unlocked, validateMnemonic, loadWallet]);

  const onUnlock = async (): Promise<void> => {
    setIsVerifyingPassword(true);
    try {
      const decrypted = await unlockWallet(password);
      setIsValidPassword(true);
      if (decrypted) setUnlocked(decrypted);
    } catch {
      setIsValidPassword(false);
    }
    setIsVerifyingPassword(false);
  };

  const onForgotPasswordClick = async (): Promise<void> => {
    saveValueInLocalStorage({ key: 'isForgotPasswordFlow', value: true });
    await deleteWallet(true);
    await backgroundService.handleOpenBrowser({ section: BrowserViewSections.FORGOT_PASSWORD });
  };

  useKeyboardShortcut(['Enter'], onUnlock);

  return validateMnemonic && unlocked ? (
    <MnemonicValidation
      plainPassword={password}
      walletKeyAgent={unlocked[environmentName]?.keyAgentData}
      onValidationSuccess={loadWallet}
    />
  ) : (
    <UnlockWallet
      isLoading={isVerifyingPassword}
      onUnlock={onUnlock}
      passwordInput={{ value: password, handleChange: handlePasswordChange, invalidPass: !isValidPassword }}
      unlockButtonDisabled={password === ''}
      onForgotPasswordClick={onForgotPasswordClick}
    />
  );
};
