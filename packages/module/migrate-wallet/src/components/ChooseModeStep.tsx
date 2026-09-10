import { useTranslation } from '@lace-contract/i18n';
import { Column } from '@lace-lib/ui-toolkit';
import React from 'react';

import { WizardFrame } from './WizardFrame';
import {
  OPTION_CARD_GAP,
  optionGroupStyle,
  WizardOptionCard,
} from './WizardOptionCard';

import type { MigrationMode } from '../store/slice';
import type { IconName } from '@lace-lib/ui-toolkit';

/** Preserve first: it is the recommended default for a multi-account source. */
const OPTIONS: readonly { mode: MigrationMode; icon: IconName }[] = [
  { mode: 'preserve', icon: 'Account' },
  { mode: 'consolidate', icon: 'Coins' },
];

interface ChooseModeStepProps {
  /** How many accounts the choice is about — named in the title. */
  accountCount: number;
  onChoose: (mode: MigrationMode) => void;
  onCancel: () => void;
  stepLabel?: string;
  stepProgress?: number;
}

/**
 * Only shown for a multi-account source: keep the account structure (one
 * transaction per account, unlinked on-chain) or consolidate into a single
 * account. A step of its own before the review, because the review renders
 * the plan this choice produces.
 */
export const ChooseModeStep = ({
  accountCount,
  onChoose,
  onCancel,
  stepLabel,
  stepProgress,
}: ChooseModeStepProps) => {
  const { t } = useTranslation();

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      title={t('migrate-wallet.choose-mode.title', { count: accountCount })}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-choose-mode">
      <Column gap={OPTION_CARD_GAP} style={optionGroupStyle}>
        {OPTIONS.map(option => (
          <WizardOptionCard
            key={option.mode}
            icon={option.icon}
            title={t(`migrate-wallet.choose-mode.${option.mode}.title`)}
            description={t(
              `migrate-wallet.choose-mode.${option.mode}.description`,
            )}
            onPress={() => {
              onChoose(option.mode);
            }}
            testID={`migrate-wallet-mode-option-${option.mode}`}
          />
        ))}
      </Column>
    </WizardFrame>
  );
};
