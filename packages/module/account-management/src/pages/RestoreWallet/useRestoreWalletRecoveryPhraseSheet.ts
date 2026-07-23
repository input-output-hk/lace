import { util } from '@cardano-sdk/key-management';
import { setRestoreWalletSecrets } from '@lace-contract/account-management';
import { useTranslation } from '@lace-contract/i18n';
import { WalletId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback } from 'react';

import { useLaceSelector, useRestoreWalletSecrets } from '../../hooks';

import { parseRecoveryPhrase } from './utils';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { RestoreWalletRecoverySheetTemplateProps } from '@lace-lib/ui-toolkit/src/design-system/templates/sheets/restoreWalletRecoverySheet';

type RestoreWalletRecoveryPhraseSheetProps =
  SheetScreenProps<SheetRoutes.RestoreWalletRecoveryPhrase>;

export const useRestoreWalletRecoveryPhraseSheet = (
  _props: RestoreWalletRecoveryPhraseSheetProps,
): RestoreWalletRecoverySheetTemplateProps => {
  const { t } = useTranslation();
  const restoreSecrets = useRestoreWalletSecrets();
  const allWallets = useLaceSelector('wallets.selectAll');

  const validator = useCallback(
    (passphrase: string): string | undefined => {
      // First validate the mnemonic format
      if (!util.validateMnemonic(passphrase)) {
        return t('v2.recovery-phrase.verification.error');
      }

      // Check if wallet already exists
      const recoveryPhrase = parseRecoveryPhrase(passphrase);
      const walletId = WalletId.deriveFromMnemonic(recoveryPhrase);
      const existingWallet = allWallets.find(w => w.walletId === walletId);

      if (existingWallet) {
        return t('v2.account-management.restore-wallet.error.already-imported');
      }

      // Valid - no error
      return undefined;
    },
    [allWallets, t],
  );

  const handleNext = useCallback((passphrase: string) => {
    const recoveryPhrase = parseRecoveryPhrase(passphrase);
    if (!recoveryPhrase.length) return;

    setRestoreWalletSecrets({ recoveryPhrase });
    NavigationControls.navigate(
      SheetRoutes.RestoreWalletSelectBlockchains,
      { hasNestedScrolling: true },
      { reset: false },
    );
  }, []);

  return {
    title: t('v2.account-management.restore-wallet.enter-passphrase.title'),
    instructionText: t(
      'v2.account-management.restore-wallet.enter-passphrase.description',
    ),
    placeholderText: t(
      'v2.account-management.restore-wallet.enter-passphrase.placeholder',
    ),
    pasteButtonLabel: t('v2.generic.btn.paste'),
    nextButtonLabel: t('v2.generic.btn.next'),
    validator,
    initialPassphrase: restoreSecrets.recoveryPhrase
      ? util.joinMnemonicWords(restoreSecrets.recoveryPhrase)
      : '',
    onNext: handleNext,
  };
};
