import { useTranslation } from '@lace-contract/i18n';
import { withMigratedTag } from '@lace-contract/wallet-repo';
import { Column, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';

import { findCardanoAccount } from '../store/helpers';

import { walletTypeLabel } from './wallet-type-label';
import { WizardFrame } from './WizardFrame';
import {
  OPTION_CARD_GAP,
  optionGroupStyle,
  WizardOptionCard,
} from './WizardOptionCard';

import type {
  AccountId,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';

interface ExistingWalletPickerProps {
  wallets: AnyWallet[];
  blockchainNetworkId: unknown;
  onSelect: (payload: {
    destinationWalletId: WalletId;
    destinationAccountId: AccountId;
  }) => void;
  onCancel: () => void;
  stepLabel?: string;
  stepProgress?: number;
  onBack?: () => void;
}

export const WalletOption = ({
  wallet,
  onSelect,
}: {
  wallet: AnyWallet;
  onSelect: (wallet: AnyWallet) => void;
}) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => {
    onSelect(wallet);
  }, [onSelect, wallet]);

  return (
    <WizardOptionCard
      title={withMigratedTag(wallet.metadata, t('wallet.migrated-marker'))}
      description={walletTypeLabel(wallet.type)}
      onPress={handlePress}
      testID={`migrate-wallet-pick-${wallet.walletId}`}
    />
  );
};

export const ExistingWalletPicker = ({
  wallets,
  blockchainNetworkId,
  onSelect,
  onCancel,
  stepLabel,
  stepProgress,
  onBack,
}: ExistingWalletPickerProps) => {
  const { t } = useTranslation();

  const cardanoWallets = useMemo(
    () =>
      wallets.filter(
        wallet => findCardanoAccount(wallet, blockchainNetworkId) !== undefined,
      ),
    [wallets, blockchainNetworkId],
  );

  const handleSelect = useCallback(
    (wallet: AnyWallet) => {
      const account = findCardanoAccount(wallet, blockchainNetworkId);
      if (!account) return;
      onSelect({
        destinationWalletId: wallet.walletId,
        destinationAccountId: account.accountId,
      });
    },
    [blockchainNetworkId, onSelect],
  );

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      title={t('migrate-wallet.choose-destination.pick-wallet.title')}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-pick-wallet">
      {/* Same as ChooseDestinationStep: cards sit directly under the title
          here, so the group carries its own top margin. */}
      <Column gap={OPTION_CARD_GAP} style={optionGroupStyle}>
        {cardanoWallets.length === 0 ? (
          <Text.S variant="tertiary" testID="migrate-wallet-pick-wallet-empty">
            {t('migrate-wallet.choose-destination.pick-wallet.no-cardano')}
          </Text.S>
        ) : (
          cardanoWallets.map(wallet => (
            <WalletOption
              key={wallet.walletId}
              wallet={wallet}
              onSelect={handleSelect}
            />
          ))
        )}
      </Column>
    </WizardFrame>
  );
};
