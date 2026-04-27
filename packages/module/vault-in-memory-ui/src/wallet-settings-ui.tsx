import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { Icon, SettingsCard } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';
import React, { useCallback } from 'react';

import type { WalletSettingsUICustomisation } from '@lace-contract/account-management';
import type { WalletId } from '@lace-contract/wallet-repo';

const ShowRecoveryPhraseComponent = ({ walletId }: { walletId: WalletId }) => {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.RecoveryPhrase, {
      walletId,
    });
  }, [walletId]);

  return (
    <SettingsCard
      iconName="PasswordValidation"
      key="show-recovery-phrase"
      testID="wallet-settings-show-recovery-phrase"
      title={t('v2.wallet-settings.show-recovery-phrase.title')}
      description={t('v2.wallet-settings.show-recovery-phrase.description')}
      rightNode={<Icon name="CaretRight" />}
      quickActions={{
        onCardPress: handlePress,
      }}
      isCritical={false}
    />
  );
};

const inMemoryWalletSettingsUICustomisation = () =>
  createUICustomisation<WalletSettingsUICustomisation>({
    key: 'in-memory',
    uiCustomisationSelector: ({ walletType }: { walletType: WalletType }) =>
      walletType === WalletType.InMemory,
    settings: [
      'customise-wallet',
      { id: 'show-recovery-phrase', component: ShowRecoveryPhraseComponent },
    ],
  });

export default inMemoryWalletSettingsUICustomisation;
