import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import { Icon, Loader, SettingsCard } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';
import React, { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { WalletSettingsUICustomisation } from '@lace-contract/account-management';
import type { WalletId } from '@lace-contract/wallet-repo';

// Guest arm of the in-memory "Show recovery phrase" row. Unlike the in-app arm
// there is no availability check: the guest wallet-repo is a host-projected
// shell, so it dispatches the reveal ceremony and the host surface renders the
// honest unavailable state for wallets without a stored phrase (ADR 36).
const ShowRecoveryPhraseComponent = ({ walletId }: { walletId: WalletId }) => {
  const { t } = useTranslation();
  const revealRecoveryPhrase = useDispatchLaceAction(
    'vault.revealRecoveryPhraseCeremonyRequested',
  );

  const handlePress = useCallback(() => {
    revealRecoveryPhrase({ walletId });
  }, [revealRecoveryPhrase, walletId]);

  // Nothing renders here until the host mounts the manager surface, which can
  // take seconds on a cold service worker. Dropping `onCardPress` is what
  // disables the card (SettingsCard derives its pressability from it).
  const pendingCeremony = useLaceSelector('vault.selectPendingCeremony');
  const isRevealPending =
    pendingCeremony?.ceremony === 'recovery-phrase' &&
    pendingCeremony.walletId === walletId;

  return (
    <SettingsCard
      iconName="PasswordValidation"
      key="show-recovery-phrase"
      testID="wallet-settings-show-recovery-phrase"
      title={t('v2.wallet-settings.show-recovery-phrase.title')}
      description={t('v2.wallet-settings.show-recovery-phrase.description')}
      rightNode={
        isRevealPending ? <Loader size={20} /> : <Icon name="CaretRight" />
      }
      quickActions={{
        onCardPress: pendingCeremony === null ? handlePress : undefined,
      }}
      isCritical={false}
    />
  );
};

const guestWalletSettingsUICustomisation = () =>
  createUICustomisation<WalletSettingsUICustomisation>({
    key: 'in-memory',
    uiCustomisationSelector: ({ walletType }: { walletType: WalletType }) =>
      walletType === WalletType.InMemory,
    settings: [
      'customise-wallet',
      { id: 'show-recovery-phrase', component: ShowRecoveryPhraseComponent },
      'wallet-security-check',
    ],
  });

export default guestWalletSettingsUICustomisation;
