import React, { useEffect, useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { MnemonicWordsWritedown } from './MnemonicWordsWritedown';
import { MnemonicWordsConfirmInput } from './MnemonicWordsConfirmInput';
import styles from './WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from '@ui/components/WalletSetup/WalletSetupMnemonicVerificationStep';
import { defaultMnemonicWordsInStep } from '@src/ui/utils/constants';

export type MnemonicStage = 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  onReset: (mnemonicStage?: MnemonicStage) => void;
  onNext: () => void;
  onStepNext?: (currentStage: MnemonicStage, currentStep: number) => void;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<
    | 'writePassphrase'
    | 'body'
    | 'enterPassphrase'
    | 'passphraseInfo1'
    | 'passphraseInfo2'
    | 'passphraseInfo3'
    | 'passphraseError'
  >;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
}

export const WalletSetupMnemonicStep = ({
  mnemonic,
  onReset,
  onNext,
  onStepNext,
  mnemonicWordsInStep = defaultMnemonicWordsInStep,
  translations,
  suggestionList,
  passphraseInfoLink
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const mnemonicLength = mnemonic.length;

  const initialMnemonicWordsConfirm = useMemo(() => mnemonic.map(() => ''), [mnemonic]);
  const mnemonicSteps = Math.round(mnemonicLength / mnemonicWordsInStep);

  const [mnemonicStep, setMnemonicStep] = useState(0);
  const [mnemonicStage, setMnemonicStage] = useState<MnemonicStage>('writedown');
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState(initialMnemonicWordsConfirm);

  // reset the state on mnemonic change
  useEffect(() => {
    setMnemonicStep(0);
    setMnemonicStage('writedown');
    setMnemonicWordsConfirm(initialMnemonicWordsConfirm);
  }, [initialMnemonicWordsConfirm, mnemonic]);

  const handleBack = () => {
    if (mnemonicStep === 0) {
      onReset(mnemonicStage);
      return;
    }
    setMnemonicStep(mnemonicStep - 1);
  };

  const handleNext = () => {
    if (onStepNext) onStepNext(mnemonicStage, mnemonicStep);
    if (mnemonicStep < mnemonicSteps - 1) {
      setMnemonicStep(mnemonicStep + 1);
      return;
    }

    if (mnemonicStage === 'writedown') {
      setMnemonicStage('input');
      setMnemonicStep(0);
      return;
    }

    onNext();
  };

  const currentMnemonicWordsProgress = (mnemonicStep + 1) * mnemonicWordsInStep;
  const stepInfoText = `${currentMnemonicWordsProgress} / ${mnemonicLength}`;
  const title = mnemonicStage === 'writedown' ? translations.writePassphrase : translations.enterPassphrase;
  const subtitle =
    mnemonicStage === 'writedown' ? (
      <>
        {translations.passphraseInfo1}
        <br />
        <b>{translations.passphraseInfo2}</b>
        <a href={passphraseInfoLink} target="_blank" className={styles.link} data-testid="find-out-more-link">
          {` ${translations.passphraseInfo3}`}
        </a>
      </>
    ) : (
      translations.body
    );
  const currentStepFirstWordIndex = mnemonicStep * mnemonicWordsInStep;
  const currentStepLastWordIndex = (mnemonicStep + 1) * mnemonicWordsInStep;
  const firstWordNumber = currentStepFirstWordIndex + 1;

  const currentStageWords = mnemonicStage === 'writedown' ? mnemonic : mnemonicConfirm;
  const currentStepWords = useMemo(
    () => currentStageWords.slice(currentStepFirstWordIndex, currentStepLastWordIndex),
    [currentStageWords, currentStepFirstWordIndex, currentStepLastWordIndex]
  );

  const isNextEnabled = useMemo(() => {
    if (mnemonicStage === 'writedown') return true;

    return mnemonic
      .slice(currentStepFirstWordIndex, currentStepLastWordIndex)
      .every(
        (word, index) => mnemonicConfirm.slice(currentStepFirstWordIndex, currentStepLastWordIndex)[index] === word
      );
  }, [mnemonic, mnemonicStage, mnemonicConfirm, currentStepFirstWordIndex, currentStepLastWordIndex]);

  return (
    <>
      <WalletSetupStepLayout
        title={title}
        description={subtitle}
        stepInfoText={stepInfoText}
        onBack={handleBack}
        onNext={handleNext}
        isNextEnabled={isNextEnabled}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
      >
        {mnemonicStage === 'writedown' ? (
          <MnemonicWordsWritedown words={currentStepWords} firstWordNumber={firstWordNumber} />
        ) : (
          <div className={styles.ContainerWordsConfirm}>
            <MnemonicWordsConfirmInput
              words={currentStepWords}
              onChange={(stepWords) => {
                const newMnemonicWordsConfirm = [...mnemonicConfirm];

                // eslint-disable-next-line unicorn/no-array-for-each
                stepWords.forEach((word, index) => {
                  newMnemonicWordsConfirm[index + currentStepFirstWordIndex] = word;
                });

                setMnemonicWordsConfirm(newMnemonicWordsConfirm);
              }}
              firstWordNumber={firstWordNumber}
              suggestionList={suggestionList}
            />
            {mnemonicStep === mnemonicSteps - 1 && !isNextEnabled && !hasEmptyString(mnemonicConfirm) && (
              <div className={styles.errorMessage}>
                <span data-testid="passphrase-error">{translations.passphraseError}</span>
              </div>
            )}
          </div>
        )}
      </WalletSetupStepLayout>
    </>
  );
};
