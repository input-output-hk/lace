import { useTranslation } from '@lace-contract/i18n';
import { Column } from '@lace-lib/ui-toolkit';
import React from 'react';

import { WizardFrame } from './WizardFrame';
import {
  OPTION_CARD_GAP,
  optionGroupStyle,
  WizardOptionCard,
} from './WizardOptionCard';

import type { DestinationType } from '../store/slice';
import type { IconName } from '@lace-lib/ui-toolkit';

interface ChooseDestinationStepProps {
  onChoose: (type: DestinationType) => void;
  onCancel: () => void;
  showExistingOption?: boolean;
  stepLabel?: string;
  stepProgress?: number;
  onBack?: () => void;
}

const OPTIONS: readonly { type: DestinationType; icon: IconName }[] = [
  { type: 'fresh', icon: 'WalletAdd' },
  { type: 'existing', icon: 'WalletCheck' },
  { type: 'hardware', icon: 'HardwareWallet' },
];

const DestinationOption = ({
  type,
  icon,
  onChoose,
}: {
  type: DestinationType;
  icon: IconName;
  onChoose: (type: DestinationType) => void;
}) => {
  const { t } = useTranslation();
  return (
    <WizardOptionCard
      icon={icon}
      title={t(`migrate-wallet.choose-destination.${type}.title`)}
      description={t(`migrate-wallet.choose-destination.${type}.description`)}
      onPress={() => {
        onChoose(type);
      }}
      testID={`migrate-wallet-option-${type}`}
    />
  );
};

export const ChooseDestinationStep = ({
  onChoose,
  onCancel,
  showExistingOption,
  stepLabel,
  stepProgress,
  onBack,
}: ChooseDestinationStepProps) => {
  const { t } = useTranslation();

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      title={t('migrate-wallet.choose-destination.title')}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-choose-destination">
      {/* Own margin rather than a bigger title block: the frame's title spacing
          is the heading-to-body-copy gap every other step relies on, and this
          step has no body copy between the two. */}
      <Column gap={OPTION_CARD_GAP} style={optionGroupStyle}>
        {OPTIONS.filter(
          option => option.type !== 'existing' || showExistingOption,
        ).map(option => (
          <DestinationOption
            key={option.type}
            type={option.type}
            icon={option.icon}
            onChoose={onChoose}
          />
        ))}
      </Column>
    </WizardFrame>
  );
};
