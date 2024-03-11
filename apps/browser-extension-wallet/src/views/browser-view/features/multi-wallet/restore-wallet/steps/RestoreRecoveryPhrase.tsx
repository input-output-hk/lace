import { WalletSetupMnemonicVerificationStep } from '@lace/core';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { Wallet } from '@lace/cardano';
import { useHistory } from 'react-router-dom';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { PostHogAction, toast } from '@lace/common';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { filter, firstValueFrom } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';

const wordList = wordlists.english;

const PASSPHRASE_STEP_1 = 0;
const PASSPHRASE_STEP_2 = 1;
const PASSPHRASE_STEP_3 = 2;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { data, setMnemonic } = useRestoreWallet();
  const { createWallet } = useWalletManager();
  const analytics = useAnalyticsContext();

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

  const onSubmitForm = useCallback(
    async (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => {
      event.preventDefault();
      try {
        const { source, wallet } = await createWallet(data);
        await analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreAdded);
        await analytics.sendMergeEvent(source.account.extendedAccountPublicKey);
        const addresses = await firstValueFrom(wallet.addresses$.pipe(filter((a) => a.length > 0)));
        const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
        if (hdWalletDiscovered) {
          analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreHdWallet);
        }
      } catch (error) {
        if (error instanceof WalletConflictError) {
          toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
        } else {
          throw error;
        }
      }
      clearSecrets();
      history.push(walletRoutePaths.assets);
    },
    [data, clearSecrets, createWallet, history, t, analytics]
  );

  return (
    <WalletSetupMnemonicVerificationStep
      mnemonic={data.mnemonic}
      onChange={setMnemonic}
      onCancel={() => {
        clearSecrets();
        history.goBack();
      }}
      onSubmit={onSubmitForm}
      onStepNext={(currentStep) => {
        switch (currentStep) {
          case PASSPHRASE_STEP_1:
            analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreEnterPassphrase01NextClick);
            break;
          case PASSPHRASE_STEP_2:
            analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreEnterPassphrase09NextClick);
            break;
          case PASSPHRASE_STEP_3:
            analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreEnterPassphrase17NextClick);
        }
      }}
      isSubmitEnabled={isValidMnemonic}
      translations={walletSetupMnemonicStepTranslations}
      suggestionList={wordList}
    />
  );
};
