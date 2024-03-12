import React, { useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { MnemonicWordsConfirmInput } from './MnemonicWordsConfirmInput';
import styles from './WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { defaultMnemonicWordsInStep } from '@src/ui/utils/constants';

export const hasEmptyString = (arr: string[]): boolean => arr.includes('');

export interface WalletSetupMnemonicVerificationStepProps {
  mnemonic: string[];
  onChange: (words: string[]) => void;
  onCancel: () => void;
  onSubmit: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
  onStepNext?: (currentStep: number) => void;
  isSubmitEnabled: boolean;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<'enterPassphrase' | 'passphraseError' | 'enterPassphraseDescription'>;
  suggestionList?: Array<string>;
}

export const WalletSetupMnemonicVerificationStep = ({
  mnemonic,
  onChange,
  onSubmit,
  onCancel,
  onStepNext,
  isSubmitEnabled,
  mnemonicWordsInStep = defaultMnemonicWordsInStep,
  translations,
  suggestionList
}: WalletSetupMnemonicVerificationStepProps): React.ReactElement => {
  const mnemonicLength = mnemonic.length;
  const mnemonicSteps = Math.round(mnemonicLength / mnemonicWordsInStep);
  const [mnemonicStep, setMnemonicStep] = useState(0);

  const handleBack = () => {
    if (mnemonicStep > 0) {
      setMnemonicStep(mnemonicStep - 1);
      return;
    }

    onCancel();
  };

  const handleNext = (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => {
    if (onStepNext) onStepNext(mnemonicStep);
    if (mnemonicStep < mnemonicSteps - 1) {
      setMnemonicStep(mnemonicStep + 1);
      return;
    }

    onSubmit(event);
  };

  const getStepInfoText = () => {
    // eslint-disable-next-line no-magic-numbers
    if (mnemonicLength <= 16 && mnemonicStep > 0) {
      return `${mnemonicLength} / ${mnemonicLength}`;
    }
    const currentMnemonicWordsProgress = (mnemonicStep + 1) * mnemonicWordsInStep;
    return `${currentMnemonicWordsProgress} / ${mnemonicLength}`;
  };

  const title = translations.enterPassphrase;
  const description = translations.enterPassphraseDescription;

  const currentStepFirstWordIndex = mnemonicStep * mnemonicWordsInStep;
  const currentStepLastWordIndex = (mnemonicStep + 1) * mnemonicWordsInStep;
  const firstWordNumber = currentStepFirstWordIndex + 1;
  const currentStepWords = useMemo(
    () => mnemonic.slice(currentStepFirstWordIndex, currentStepLastWordIndex),
    [currentStepFirstWordIndex, currentStepLastWordIndex, mnemonic]
  );

  const isNextEnabled = useMemo(
    () => currentStepWords.every((word) => word) && (mnemonicStep !== mnemonicSteps - 1 || isSubmitEnabled),
    [mnemonicStep, currentStepWords, mnemonicSteps, isSubmitEnabled]
  );

  return (
    <WalletSetupStepLayout
      title={title}
      description={description}
      stepInfoText={getStepInfoText()}
      onBack={handleBack}
      onNext={handleNext}
      isNextEnabled={isNextEnabled}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
    >
      <div className={styles.ContainerWordsConfirm}>
        <MnemonicWordsConfirmInput
          words={currentStepWords}
          onChange={(stepWords) => {
            const newMnemonic = [...mnemonic];

            // eslint-disable-next-line unicorn/no-array-for-each
            stepWords.forEach((word, index) => {
              newMnemonic[index + currentStepFirstWordIndex] = word;
            });

            onChange(newMnemonic);
          }}
          firstWordNumber={firstWordNumber}
          suggestionList={suggestionList}
        />
      </div>
      {mnemonicStep === mnemonicSteps - 1 && !isSubmitEnabled && !hasEmptyString(mnemonic) && (
        <div className={styles.errorMessage}>
          <span data-testid="passphrase-error">{translations.passphraseError}</span>
        </div>
      )}
    </WalletSetupStepLayout>
  );
};
