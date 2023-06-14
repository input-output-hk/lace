import React, { useMemo, useState } from 'react';
import cn from 'classnames';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import styles from './WalletSetupRegisterStep.module.scss';
import { Input } from '@lace/common';
import { TranslationsFor } from '@ui/utils/types';

interface WalletSetupRegisterSubmitParams {
  walletName: string;
}

const nameShouldHaveRightLengthRegex = /^.{1,20}$/;

type validationErrorKeys = 'nameMaxLength';

const validateNameLength = (name: string): validationErrorKeys | '' =>
  nameShouldHaveRightLengthRegex.test(name) ? '' : 'nameMaxLength';

const WALLET_NAME_INPUT_MAX_LENGTH = 30;

export interface WalletSetupRegisterStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupRegisterSubmitParams) => void;
  initialWalletName?: string;
  translations: TranslationsFor<'title' | 'description' | 'nameRequired' | validationErrorKeys | 'walletName'>;
}

export const WalletSetupRegisterStep = ({
  onBack,
  onNext,
  initialWalletName = '',
  translations
}: WalletSetupRegisterStepProps): React.ReactElement => {
  const [walletName, setWalletName] = useState(initialWalletName);
  const [shouldShowErrorMessage, setShouldShowErrorMessage] = useState(false);

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(walletName)
      ? translations[validateNameLength(walletName) as validationErrorKeys]
      : '';
    return walletName ? validationError : translations.nameRequired;
  }, [translations, walletName]);

  const isFormValid = useMemo(() => Boolean(!walletNameErrorMessage), [walletNameErrorMessage]);

  const handleOnChange = (value: string) => {
    setWalletName(value);
    setShouldShowErrorMessage(true);
  };

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      onBack={onBack}
      onNext={() => onNext({ walletName })}
      isNextEnabled={isFormValid}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
    >
      <div className={styles.walletSetupRegisterStep}>
        <div style={{ position: 'relative' }}>
          <Input
            dataTestId="wallet-setup-register-name-input"
            value={walletName}
            label={translations.walletName}
            onChange={(e) => handleOnChange(e.target.value)}
            maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
          />
          {shouldShowErrorMessage && (
            <p
              className={cn(styles.label, { [styles.error]: shouldShowErrorMessage })}
              data-testid="wallet-setup-register-name-error"
            >
              {walletNameErrorMessage}
            </p>
          )}
        </div>
      </div>
    </WalletSetupStepLayout>
  );
};
