import { WalletSetupMnemonicVerificationStepRevamp } from '@lace/core';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { Wallet } from '@lace/cardano';
import { useRestoreWallet } from '../context';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';

const wordList = wordlists.english;
const DEFAULT_MNEMONIC_LENGTH = 24;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const { back, createWalletData, next, setMnemonic } = useRestoreWallet();
  const analytics = useAnalyticsContext();
  const isValidMnemonic = useMemo(
    () =>
      Wallet.KeyManagement.util.validateMnemonic(
        Wallet.KeyManagement.util.joinMnemonicWords(createWalletData.mnemonic)
      ),
    [createWalletData.mnemonic]
  );
  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);

  useEffect(() => {
    setMnemonic(Array.from({ length: mnemonicLength }).map(() => ''));
  }, [mnemonicLength, setMnemonic]);

  const walletSetupMnemonicStepTranslations = {
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterPassphraseLength: t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength'),
    pasteFromClipboard: t('core.walletSetupMnemonicStepRevamp.pasteFromClipboard')
  };

  const handleMnemonicVerification = (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => {
    event.preventDefault();
    void analytics.sendEventToPostHog(postHogOnboardingActions.restore?.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
    void next();
  };

  return (
    <WalletSetupMnemonicVerificationStepRevamp
      mnemonic={createWalletData.mnemonic}
      onChange={setMnemonic}
      onCancel={back}
      onSubmit={handleMnemonicVerification}
      isSubmitEnabled={isValidMnemonic}
      translations={walletSetupMnemonicStepTranslations}
      suggestionList={wordList}
      defaultMnemonicLength={DEFAULT_MNEMONIC_LENGTH}
      onSetMnemonicLength={(value: number) => setMnemonicLength(value)}
      onPasteFromClipboard={() =>
        analytics.sendEventToPostHog(postHogOnboardingActions.restore?.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
      }
    />
  );
};
