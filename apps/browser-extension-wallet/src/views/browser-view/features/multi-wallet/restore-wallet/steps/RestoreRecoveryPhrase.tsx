import { WalletSetupMnemonicVerificationStepRevamp } from '@lace/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { filter, firstValueFrom } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';

const wordList = wordlists.english;
const DEFAULT_MNEMONIC_LENGTH = 24;
const COPY_PASTE_TOOLTIP_URL = `${process.env.FAQ_URL}?question=best-practices-for-using-the-copy-to-clipboard-paste-from-clipboard-recovery-phrase-features`;

export const RestoreRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { data, setMnemonic } = useRestoreWallet();
  const { createWallet, walletRepository } = useWalletManager();
  const analytics = useAnalyticsContext();
  const isValidMnemonic = useMemo(
    () => Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(data.mnemonic)),
    [data.mnemonic]
  );

  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);

  useEffect(() => {
    setMnemonic(Array.from({ length: mnemonicLength }, () => ''));
  }, [mnemonicLength, setMnemonic]);

  const clearSecrets = useCallback(() => {
    for (let i = 0; i < data.mnemonic.length; i++) {
      data.mnemonic[i] = '';
    }
    data.password = '';
  }, [data]);

  const handleReadMoreOnClick = () => {
    void analytics.sendEventToPostHog(postHogMultiWalletActions.restore.RECOVERY_PHRASE_PASTE_READ_MORE_CLICK);
  };

  const walletSetupMnemonicStepTranslations = {
    writePassphraseTitle: t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'),
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription'),
    writePassphraseSubtitle1: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1'),
    writePassphraseSubtitle2: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterPassphraseLength: t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength'),
    copyToClipboard: t('core.walletSetupMnemonicStepRevamp.copyToClipboard'),
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

  const onSubmitForm = useCallback(async () => {
    try {
      const { source, wallet } = await createWallet(data);
      await analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreEnterRecoveryPhraseNextClick);

      // move this to name-password setup submit handle after order changes
      await analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreEnterWalletClick, {
        // eslint-disable-next-line camelcase
        $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
      });
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
  }, [data, clearSecrets, createWallet, history, t, analytics, walletRepository]);

  const handleMnemonicVerification = (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => {
    event.preventDefault();
    analytics.sendEventToPostHog(postHogMultiWalletActions.restore?.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
    onSubmitForm();
  };

  return (
    <WalletSetupMnemonicVerificationStepRevamp
      mnemonic={data.mnemonic}
      onChange={setMnemonic}
      onCancel={() => {
        clearSecrets();
        history.goBack();
      }}
      onSubmit={handleMnemonicVerification}
      isSubmitEnabled={isValidMnemonic}
      translations={walletSetupMnemonicStepTranslations}
      suggestionList={wordList}
      defaultMnemonicLength={DEFAULT_MNEMONIC_LENGTH}
      onSetMnemonicLength={(value: number) => setMnemonicLength(value)}
      onPasteFromClipboard={() =>
        analytics.sendEventToPostHog(postHogMultiWalletActions.restore?.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
      }
    />
  );
};
