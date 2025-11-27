import React, { useMemo, useState } from 'react';
import styles from './Voting.module.scss';
import { Button, HiddenPinCodePreview, PinCodeInput, PinCodeInputValueType } from '@lace/common';
import { TranslationsFor } from '@wallet/util/types';

export interface CatalystPinStepProps {
  onCancel: () => void;
  onSubmit: (pinCode: PinCodeInputValueType) => void;
  translations: TranslationsFor<
    'confirmPin' | 'setPin' | 'resetPin' | 'pinNotMatching' | 'cancelButton' | 'confirmButton'
  >;
}

const pinCodeLength = 4;
const defaultPinCodeInputValue: PinCodeInputValueType = Array.from({ length: pinCodeLength });

export const CatalystPinStep = ({ onCancel, onSubmit, translations }: CatalystPinStepProps): React.ReactElement => {
  const [firstPinCode, setFirstPinCode] = useState<PinCodeInputValueType>(defaultPinCodeInputValue);
  const [secondPinCode, setSecondPinCode] = useState<PinCodeInputValueType>(defaultPinCodeInputValue);
  const [isFirstPinCodeSubmitted, setIsFirstPinCodeSubmitted] = useState(false);

  const [shouldShowResetOption, setShouldShowResetOption] = useState(false);

  const isFirstPinCodeValid = useMemo(() => firstPinCode.every((value) => value !== undefined), [firstPinCode]);

  const handleResetPin = () => {
    setShouldShowResetOption(false);
    setIsFirstPinCodeSubmitted(false);
    setFirstPinCode(defaultPinCodeInputValue);
    setSecondPinCode(defaultPinCodeInputValue);
  };

  const handleConfirm = () => {
    if (isFirstPinCodeSubmitted) {
      const isSecondPinValid = firstPinCode.every((value, index) => value === secondPinCode[index]);
      if (isSecondPinValid) {
        onSubmit(firstPinCode);
        return;
      }

      setShouldShowResetOption(true);
      return;
    }

    if (isFirstPinCodeValid) {
      setIsFirstPinCodeSubmitted(true);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h5>{isFirstPinCodeSubmitted ? translations.confirmPin : translations.setPin}</h5>
      <div className={styles.pinContent}>
        {isFirstPinCodeSubmitted ? (
          <>
            <HiddenPinCodePreview length={pinCodeLength} />
            <PinCodeInput value={secondPinCode} onChange={setSecondPinCode} />
            {shouldShowResetOption && (
              <>
                <p className={styles.error}>{translations.pinNotMatching}</p>
                <button className={styles.reset} onClick={handleResetPin}>
                  {translations.resetPin}
                </button>
              </>
            )}
          </>
        ) : (
          <PinCodeInput value={firstPinCode} onChange={setFirstPinCode} />
        )}
      </div>
      <div className={styles.footer}>
        <Button color="secondary" onClick={onCancel}>
          {translations.cancelButton}
        </Button>
        <Button disabled={!isFirstPinCodeValid} onClick={handleConfirm}>
          {translations.confirmButton}
        </Button>
      </div>
    </div>
  );
};
