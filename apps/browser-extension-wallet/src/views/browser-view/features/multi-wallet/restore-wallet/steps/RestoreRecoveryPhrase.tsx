import { WalletSetupMnemonicVerificationStep } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { Wallet } from '@lace/cardano';
import { useHistory } from 'react-router-dom';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes';

const noop = (): void => void 0;

const wordList = wordlists.english;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { data, setMnemonic, withConfirmationDialog } = useRestoreWallet();

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

  return (
    <>
      <WalletSetupMnemonicVerificationStep
        mnemonic={data.mnemonic}
        onChange={(mnemonic) => setMnemonic(mnemonic)}
        onCancel={withConfirmationDialog(() => history.goBack())}
        onSubmit={() => history.push(walletRoutePaths.assets)}
        onStepNext={noop}
        isSubmitEnabled={Wallet.KeyManagement.util.validateMnemonic(
          Wallet.KeyManagement.util.joinMnemonicWords(data.mnemonic)
        )}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
      />
    </>
  );
};
