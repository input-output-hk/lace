import { WalletSetupMnemonicVerificationStepRevamp } from '@lace/core';
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { Wallet } from '@lace/cardano';
import { useRestoreWallet } from '../context';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { useWalletOnboarding } from '../../walletOnboardingContext';

const wordList = wordlists.english;
const DEFAULT_MNEMONIC_LENGTH = 24;
const COPY_PASTE_TOOLTIP_URL = `${process.env.FAQ_URL}?question=best-practices-for-using-the-copy-to-clipboard-paste-from-clipboard-recovery-phrase-features`;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const { forgotPasswordFlowActive, postHogActions } = useWalletOnboarding();
  const { back, createWalletData, next, setMnemonic, onRecoveryPhraseLengthChange } = useRestoreWallet();
  const analytics = useAnalyticsContext();
  const isValidMnemonic = useMemo(
    () =>
      Wallet.KeyManagement.util.validateMnemonic(
        Wallet.KeyManagement.util.joinMnemonicWords(createWalletData.mnemonic)
      ),
    [createWalletData.mnemonic]
  );

  const handleReadMoreOnClick = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.RECOVERY_PHRASE_PASTE_READ_MORE_CLICK);
  };

  const walletSetupMnemonicStepTranslations = {
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterPassphraseLength: t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength'),
    pasteFromClipboard: t('core.walletSetupMnemonicStepRevamp.pasteFromClipboard'),
    copyPasteTooltipText: (
      <Trans
        i18nKey="core.walletSetupMnemonicStepRevamp.copyPasteTooltipText"
        components={{
          a: (
            <a
              href={COPY_PASTE_TOOLTIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleReadMoreOnClick}
            />
          )
        }}
      />
    )
  };

  const handleMnemonicVerification = (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => {
    event.preventDefault();
    void analytics.sendEventToPostHog(postHogActions.restore.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
    void next();
  };

  return (
    <WalletSetupMnemonicVerificationStepRevamp
      mnemonic={createWalletData.mnemonic}
      onChange={setMnemonic}
      onCancel={!forgotPasswordFlowActive && back}
      onSubmit={handleMnemonicVerification}
      isSubmitEnabled={isValidMnemonic}
      translations={walletSetupMnemonicStepTranslations}
      suggestionList={wordList}
      defaultMnemonicLength={DEFAULT_MNEMONIC_LENGTH}
      onSetMnemonicLength={onRecoveryPhraseLengthChange}
      onPasteFromClipboard={() =>
        analytics.sendEventToPostHog(postHogActions.restore.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
      }
    />
  );
};
