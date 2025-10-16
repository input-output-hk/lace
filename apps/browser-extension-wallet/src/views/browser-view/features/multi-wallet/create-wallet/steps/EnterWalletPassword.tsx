import React, { ReactElement } from 'react';
import { WalletSetupEnterPasswordStep } from '@lace/core';
import { useCreateWallet } from '../context';
import { useWalletManager } from '@hooks';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { useTranslation } from 'react-i18next';

const SUPPORTED_PASSPHRASE_LENGTH = 24;

export const EnterWalletPassword = (): ReactElement => {
  const { back, walletToReuse, setMnemonic, next, showRecoveryPhraseError } = useCreateWallet();
  const { getMnemonicForWallet } = useWalletManager();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const { t } = useTranslation();

  const handleSubmit = async (password: string) => {
    try {
      const mnemonic = await getMnemonicForWallet(walletToReuse, Buffer.from(password));
      if (mnemonic.length < SUPPORTED_PASSPHRASE_LENGTH) {
        showRecoveryPhraseError();
        return;
      }

      setMnemonic(mnemonic);
      await next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
        setErrorMessage(t('walletSetup.reuseRecoveryPhrase.invalidPassword'));
        return;
      }

      if (error instanceof WalletConflictError) {
        setErrorMessage(t('walletSetup.reuseRecoveryPhrase.walletAlreadyExists'));
        return;
      }
      setErrorMessage(error.message);
    }
  };

  return (
    <WalletSetupEnterPasswordStep
      walletName={walletToReuse?.metadata.name}
      onNext={handleSubmit}
      onBack={back}
      errorMessage={errorMessage}
    />
  );
};
