import React, { ReactElement } from 'react';
import { WalletWithMnemonic, WalletSetupEnterPasswordStep } from '@lace/core';
import { useCreateWallet } from '../context';
import { useWalletManager } from '@hooks';
import { AnyWallet, WalletConflictError } from '@cardano-sdk/web-extension';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { decryptMnemonic } from '@src/utils/lmp';

const SUPPORTED_PASSPHRASE_LENGTH = 24;

type CardanoWallet = AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;

const isLmpBundleWallet = (wallet: unknown): wallet is Wallet.LmpBundleWallet =>
  wallet !== null && typeof wallet === 'object' && 'blockchain' in wallet;

const getWalletDisplayName = (wallet: WalletWithMnemonic | null): string | undefined =>
  wallet ? (isLmpBundleWallet(wallet) ? wallet.walletName : (wallet as CardanoWallet).metadata?.name) : undefined;

export const EnterWalletPassword = (): ReactElement => {
  const { back, walletToReuse, setMnemonic, next, showRecoveryPhraseError } = useCreateWallet();
  const { getMnemonicForWallet } = useWalletManager();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const { t } = useTranslation();

  const handleSubmit = async (password: string) => {
    try {
      const mnemonic =
        isLmpBundleWallet(walletToReuse) && walletToReuse.encryptedRecoveryPhrase
          ? await decryptMnemonic(walletToReuse.encryptedRecoveryPhrase, password)
          : await getMnemonicForWallet(walletToReuse as CardanoWallet, new Uint8Array(Buffer.from(password)));

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
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <WalletSetupEnterPasswordStep
      walletName={getWalletDisplayName(walletToReuse)}
      onNext={handleSubmit}
      onBack={back}
      errorMessage={errorMessage}
    />
  );
};
