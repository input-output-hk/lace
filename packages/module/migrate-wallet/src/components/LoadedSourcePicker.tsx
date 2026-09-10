import { useTranslation } from '@lace-contract/i18n';
import { Column, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { WalletOption } from './ExistingWalletPicker';
import { WizardFrame } from './WizardFrame';
import { OPTION_CARD_GAP, optionGroupStyle } from './WizardOptionCard';

import type { AnyWallet } from '@lace-contract/wallet-repo';

interface LoadedSourcePickerProps {
  /** Already filtered to eligible sources — the wizard owns the rule. */
  wallets: AnyWallet[];
  onSelect: (wallet: AnyWallet) => void;
  onCancel: () => void;
  onBack: () => void;
  stepLabel?: string;
  stepProgress?: number;
}

/**
 * Which loaded wallet to migrate from. The list is the wizard's filtered set
 * (in-memory wallets with a Cardano account on the active network, minus the
 * destination); the empty state exists only for the interval in which the
 * last candidate is removed while this screen is open.
 */
export const LoadedSourcePicker = ({
  wallets,
  onSelect,
  onCancel,
  onBack,
  stepLabel,
  stepProgress,
}: LoadedSourcePickerProps) => {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (wallet: AnyWallet) => {
      onSelect(wallet);
    },
    [onSelect],
  );

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.old-wallet')}
      title={t('migrate-wallet.choose-source.pick-loaded.title')}
      backLabel={t('migrate-wallet.nav.back')}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-pick-loaded-source">
      <Column gap={OPTION_CARD_GAP} style={optionGroupStyle}>
        {wallets.length === 0 ? (
          <Text.S
            variant="tertiary"
            testID="migrate-wallet-pick-loaded-source-empty">
            {t('migrate-wallet.choose-source.pick-loaded.empty')}
          </Text.S>
        ) : (
          wallets.map(wallet => (
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
