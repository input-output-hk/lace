import React, { useMemo, useState } from 'react';
import { OnPasswordChange, PasswordVerification } from '@lace/common';
import { WalletTimelineSteps } from '../WalletSetup/WalletSetupStepLayout';
import { BarStates, WalletSetupNamePasswordSubmitParams } from '../WalletSetup/WalletSetupNamePasswordStep/types';
import {
  getComplexityBarStateList,
  MINIMUM_PASSWORD_LEVEL_REQUIRED,
  passwordStrengthFeedbackMap,
  validateNameLength,
  WALLET_NAME_INPUT_MAX_LENGTH
} from '../WalletSetup/WalletSetupNamePasswordStep/utils';
import { WalletNameInput } from '../WalletSetup/WalletSetupNamePasswordStep/WalletNameInput';
import { WalletPasswordConfirmationInput } from '../WalletSetup/WalletSetupNamePasswordStep/WalletPasswordConfirmationInput';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { TranslationsFor } from '@ui/utils/types';
import { passwordComplexity } from '@ui/utils/password-complexity';
import styles from '../WalletSetup/WalletSetupNamePasswordStep/styles.module.scss';
import { useTranslation } from 'react-i18next';
import { useSecrets } from '@src/ui/hooks';

export interface WalletSetupNamePasswordStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupNamePasswordSubmitParams) => void | Promise<void>;
  initialWalletName?: string;
  translations: TranslationsFor<
    | 'title'
    | 'description'
    | 'nameInputLabel'
    | 'passwordInputLabel'
    | 'confirmPasswordInputLabel'
    | 'noMatchPassword'
    | 'nameMaxLength'
    | 'nameRequiredMessage'
    | 'confirmButton'
  >;
}

const INITIAL_WALLET_NAME = 'Wallet 1';

export const WalletSetupNamePasswordStepRevamp = ({
  onBack,
  onNext,
  initialWalletName = INITIAL_WALLET_NAME,
  translations
}: WalletSetupNamePasswordStepProps): React.ReactElement => {
  const { t } = useTranslation();
  const { password, setPassword, passwordConfirmation, setPasswordConfirmation } = useSecrets();
  const [nextButtonLoading, setNextButtonLoading] = useState(false);
  const [passHasBeenValidated, setPassHasBeenValidated] = useState(false);
  const [walletName, setWalletName] = useState(initialWalletName);
  const [shouldShowNameErrorMessage, setShouldShowNameErrorMessage] = useState(false);

  const { score } = passwordComplexity(password.value);

  const complexityBarList: BarStates = useMemo(() => getComplexityBarStateList(score), [score]);

  const passwordConfirmationErrorMessage =
    passHasBeenValidated && password.value !== passwordConfirmation.value ? translations.noMatchPassword : '';

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(walletName) ? translations.nameMaxLength : '';
    return walletName ? validationError : translations.nameRequiredMessage;
  }, [walletName, translations.nameMaxLength, translations.nameRequiredMessage]);

  const isNextButtonEnabled = () => {
    const hasMinimumLevelRequired = score >= MINIMUM_PASSWORD_LEVEL_REQUIRED;
    const isNotEmptyPassword = password.value?.length > 0;
    const isValidPassword = Boolean(
      passHasBeenValidated && !passwordConfirmationErrorMessage && hasMinimumLevelRequired && isNotEmptyPassword
    );
    const isValidName = Boolean(!walletNameErrorMessage);

    return isValidName && isValidPassword;
  };

  const handleNameChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setWalletName(value);
    setShouldShowNameErrorMessage(true);
  };

  const handlePasswordChange: OnPasswordChange = (pw) => {
    setPassword(pw);
  };

  const handlePasswordConfirmationChange: OnPasswordChange = (pw) => {
    setPassHasBeenValidated(true);
    setPasswordConfirmation(pw);
  };

  const handleNextButtonClick = async () => {
    try {
      setNextButtonLoading(true);
      await onNext({ walletName });
    } finally {
      setNextButtonLoading(false);
    }
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={translations.title}
      description={translations.description}
      onBack={onBack}
      onNext={handleNextButtonClick}
      isNextEnabled={isNextButtonEnabled()}
      isNextLoading={nextButtonLoading}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
      nextLabel={translations.confirmButton}
    >
      <div className={styles.walletPasswordAndNameContainer}>
        <WalletNameInput
          value={walletName}
          label={translations.nameInputLabel}
          onChange={handleNameChange}
          maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
          shouldShowErrorMessage={shouldShowNameErrorMessage}
          errorMessage={walletNameErrorMessage}
        />
        <PasswordVerification
          className={styles.input}
          label={translations.passwordInputLabel}
          onChange={handlePasswordChange}
          level={score}
          feedbacks={passwordStrengthFeedbackMap[score] && [t(passwordStrengthFeedbackMap[score])]}
          complexityBarList={complexityBarList}
          data-testid="wallet-password-verification-input"
        />
        <WalletPasswordConfirmationInput
          isVisible={score >= MINIMUM_PASSWORD_LEVEL_REQUIRED}
          onChange={handlePasswordConfirmationChange}
          label={translations.confirmPasswordInputLabel}
          errorMessage={passwordConfirmationErrorMessage}
          shouldShowErrorMessage={!!passwordConfirmationErrorMessage}
        />
      </div>
    </WalletSetupStepLayoutRevamp>
  );
};
