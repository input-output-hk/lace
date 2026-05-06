import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { Icon, Modal, SettingsCard } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';
import React, { useCallback, useState } from 'react';

import { useLaceSelector } from './hooks';

import type { WalletSettingsUICustomisation } from '@lace-contract/account-management';
import type { InMemoryWallet, WalletId } from '@lace-contract/wallet-repo';

const ShowRecoveryPhraseComponent = ({ walletId }: { walletId: WalletId }) => {
  const { t } = useTranslation();
  const wallet = useLaceSelector('wallets.selectWalletById', walletId) as
    | InMemoryWallet
    | undefined;
  const hasRecoveryPhrase = Boolean(wallet?.encryptedRecoveryPhrase);
  const [isUnavailableModalVisible, setIsUnavailableModalVisible] =
    useState(false);

  const handlePress = useCallback(() => {
    if (!hasRecoveryPhrase) {
      setIsUnavailableModalVisible(true);
      return;
    }
    NavigationControls.sheets.navigate(SheetRoutes.RecoveryPhrase, {
      walletId,
    });
  }, [walletId, hasRecoveryPhrase]);

  const closeUnavailableModal = useCallback(() => {
    setIsUnavailableModalVisible(false);
  }, []);

  return (
    <>
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
      <Modal
        visible={isUnavailableModalVisible}
        onClose={closeUnavailableModal}
        onConfirm={closeUnavailableModal}
        icon="AlertSquare"
        iconSize={64}
        title={t('v2.wallet-settings.no-recovery-phrase.title')}
        description={t('v2.wallet-settings.no-recovery-phrase.description')}
        confirmText={t('v2.wallet-settings.no-recovery-phrase.confirm')}
        testIdPrefix="wallet-settings-no-recovery-phrase-modal"
      />
    </>
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
