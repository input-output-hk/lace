import { useTranslation } from '@lace-contract/i18n';
import { Column } from '@lace-lib/ui-toolkit';
import React from 'react';

import { WizardFrame } from './WizardFrame';
import {
  OPTION_CARD_GAP,
  optionGroupStyle,
  WizardOptionCard,
} from './WizardOptionCard';

import type { SourceType } from '../store/slice';
import type { IconName } from '@lace-lib/ui-toolkit';

const OPTIONS: readonly { type: SourceType; icon: IconName }[] = [
  { type: 'phrase', icon: 'PencilEdit' },
  { type: 'hardware', icon: 'HardwareWallet' },
  { type: 'loaded', icon: 'WalletCheck' },
];

interface ChooseSourceStepProps {
  onChoose: (type: SourceType) => void;
  onCancel: () => void;
  /** Hidden when no loaded wallet is eligible — an option that only ever
   * opens an empty picker is a dead end dressed as a choice. */
  hasLoadedCandidates: boolean;
  stepLabel?: string;
  stepProgress?: number;
}

/**
 * Where is the old wallet — a phrase to type, a device to connect, or a wallet
 * already loaded in Lace. One decision on one screen, mirroring the
 * destination chooser: the journeys that follow share nothing, so none
 * renders as an afterthought of another.
 */
export const ChooseSourceStep = ({
  onChoose,
  onCancel,
  hasLoadedCandidates,
  stepLabel,
  stepProgress,
}: ChooseSourceStepProps) => {
  const { t } = useTranslation();

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.old-wallet')}
      title={t('migrate-wallet.choose-source.title')}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-choose-source">
      <Column gap={OPTION_CARD_GAP} style={optionGroupStyle}>
        {OPTIONS.filter(
          option => option.type !== 'loaded' || hasLoadedCandidates,
        ).map(option => (
          <WizardOptionCard
            key={option.type}
            icon={option.icon}
            title={t(`migrate-wallet.choose-source.${option.type}.title`)}
            description={t(
              `migrate-wallet.choose-source.${option.type}.description`,
            )}
            onPress={() => {
              onChoose(option.type);
            }}
            testID={`migrate-wallet-source-option-${option.type}`}
          />
        ))}
      </Column>
    </WizardFrame>
  );
};
