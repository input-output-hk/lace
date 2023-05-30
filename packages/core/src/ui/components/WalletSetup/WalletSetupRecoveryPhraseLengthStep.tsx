import React from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from '@ui/components/WalletSetup/WalletSetupStepLayout';
import { RadioChangeEvent } from 'antd';
import { Radio, RadioGroup } from '@lace/common';
import styles from './WalletSetupRecoveryPhraseLengthStep.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export interface WalletSetupRecoveryPhraseLengthStepProps {
  onBack: () => void;
  onNext: (params: { recoveryPhraseLength: number }) => void;
  translations: TranslationsFor<'title' | 'description' | 'wordPassphrase'>;
}

// eslint-disable-next-line no-magic-numbers
const RECOVERY_PHRASE_LENGTHS = [12, 15, 24];
const DEFAULT_RECOVERY_PHRASE_LENGTH = 24;

export const WalletSetupRecoveryPhraseLengthStep = ({
  onBack,
  onNext,
  translations
}: WalletSetupRecoveryPhraseLengthStepProps): React.ReactElement => {
  const [value, setValue] = React.useState(DEFAULT_RECOVERY_PHRASE_LENGTH);

  const onChange = (e: RadioChangeEvent) => {
    setValue(e.target.value);
  };

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      onNext={() => onNext({ recoveryPhraseLength: value })}
      onBack={onBack}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
    >
      <RadioGroup onChange={onChange} value={value} className={styles.radioGroup}>
        {RECOVERY_PHRASE_LENGTHS.map((length) => (
          <Radio value={length} key={length} data-testid={`${length}-word-passphrase-radio-button`}>
            {`${length}-${translations.wordPassphrase}`}
          </Radio>
        ))}
      </RadioGroup>
    </WalletSetupStepLayout>
  );
};
