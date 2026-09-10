import { useTranslation } from '@lace-contract/i18n';
import { Icon, SettingsCard } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';
import React, { useCallback } from 'react';

import { useLaceSelector } from '../hooks';
import { openWizardRef } from '../open-wizard-ref';
import { findCardanoAccount, isMigratableSourceWallet } from '../store/helpers';

import type { WalletSettingsUICustomisation } from '@lace-contract/account-management';
import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * The per-wallet migration entry: acts on the wallet the user is looking at,
 * so the wizard opens with this wallet pre-selected as the source and skips
 * the source chooser. The safe sibling of "Remove wallet" — everything moves
 * to another wallet first.
 */
const MigrateThisWallet = ({ walletId }: { walletId: WalletId }) => {
  const { t } = useTranslation();
  const wallet = useLaceSelector('wallets.selectWalletById', walletId);
  const blockchainNetworkId = useLaceSelector(
    'cardanoContext.selectBlockchainNetworkId',
  );

  const handlePress = useCallback(() => {
    openWizardRef.current?.('wallet-settings', { sourceWalletId: walletId });
  }, [walletId]);

  // Mnemonic and hardware wallets with a Cardano account on the active
  // network can be loaded sources — anything else keeps its list unchanged.
  if (
    !isMigratableSourceWallet(wallet) ||
    findCardanoAccount(wallet, blockchainNetworkId) === undefined
  ) {
    return null;
  }

  return (
    <SettingsCard
      iconName="ArrowTurnForward"
      key="migrate-this-wallet"
      testID="wallet-settings-migrate-wallet"
      title={t('migrate-wallet.wallet-settings.title')}
      description={t('migrate-wallet.wallet-settings.description')}
      rightNode={<Icon name="CaretRight" />}
      quickActions={{
        onCardPress: handlePress,
      }}
      isCritical={false}
    />
  );
};

const walletSettingsUICustomisation = () =>
  createUICustomisation<WalletSettingsUICustomisation>({
    key: 'migrate-wallet',
    // Matches every wallet type: the row itself decides per wallet, and a
    // broad match keeps this contributor present for hardware types whose
    // vault contributes no settings customisation of its own.
    uiCustomisationSelector: () => true,
    settings: [
      {
        id: 'migrate-this-wallet',
        component: MigrateThisWallet,
      },
    ],
  });

export default walletSettingsUICustomisation;
