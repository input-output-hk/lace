import { WalletSetupMnemonicVerificationStep } from '@lace/core';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { Wallet } from '@lace/cardano';
import { useHistory } from 'react-router-dom';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes';
import noop from 'lodash/noop';
import { useWalletManager } from '@hooks';
import { toast } from '@lace/common';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { WalletConflictError } from '@cardano-sdk/web-extension';

const wordList = wordlists.english;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { data, setMnemonic } = useRestoreWallet();
  const { createWallet } = useWalletManager();
  const isValidMnemonic = useMemo(
    () => Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(data.mnemonic)),
    [data.mnemonic]
  );

  const clearSecrets = useCallback(() => {
    for (let i = 0; i < data.mnemonic.length; i++) {
      data.mnemonic[i] = '';
    }
    data.password = '';
  }, [data]);

  const walletSetupMnemonicStepTranslations = {
    writePassphrase: t('core.walletSetupMnemonicStep.writePassphrase'),
    body: t('core.walletSetupMnemonicStep.body'),
    enterPassphrase: t('core.walletSetupMnemonicStep.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStep.enterPassphraseDescription'),
    passphraseInfo1: t('core.walletSetupMnemonicStep.passphraseInfo1'),
    passphraseInfo2: t('core.walletSetupMnemonicStep.passphraseInfo2'),
    passphraseInfo3: t('core.walletSetupMnemonicStep.passphraseInfo3'),
    passphraseError: t('core.walletSetupMnemonicStep.passphraseError')
  };

  const onSubmitForm = useCallback(async () => {
    event.preventDefault();

    try {
      await createWallet(data);
    } catch (error) {
      if (error instanceof WalletConflictError) {
        toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
      } else {
        throw error;
      }
    }
    clearSecrets();
    history.push(walletRoutePaths.assets);
  }, [data, clearSecrets, createWallet, history, t]);

  return (
    <WalletSetupMnemonicVerificationStep
      mnemonic={data.mnemonic}
      onChange={setMnemonic}
      onCancel={() => {
        clearSecrets();
        history.goBack();
      }}
      onSubmit={onSubmitForm}
      onStepNext={noop}
      isSubmitEnabled={isValidMnemonic}
      translations={walletSetupMnemonicStepTranslations}
      suggestionList={wordList}
    />
  );
};
