import React, { useMemo, useState } from 'react';
import { PasswordVerification } from '@lace/common';
// import { useSecrets } from '../../hooks';
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

export interface WalletSetupNamePasswordStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupNamePasswordSubmitParams) => void | Promise<void>;
  initialWalletName?: string;
  onChange?: (state: { name: string }) => void;
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
  onChange,
  translations
}: WalletSetupNamePasswordStepProps): React.ReactElement => {
  const { t } = useTranslation();
  // const secrets = useSecrets();
  const [nextButtonLoading, setNextButtonLoading] = useState(false);
  const [passHasBeenValidated] = useState(true);
  const [walletName, setWalletName] = useState(initialWalletName);
  const [shouldShowNameErrorMessage, setShouldShowNameErrorMessage] = useState(false);

  const { score } = useMemo(() => {
    const passwordInput = document.querySelector<HTMLInputElement>('#lace-password-input') || { value: '' };
    return passwordComplexity(passwordInput.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletName]);

  const complexityBarList: BarStates = useMemo(() => getComplexityBarStateList(score), [score]);

  const passwordConfirmationErrorMessage = useMemo(() => {
    const passwordInput = document.querySelector<HTMLInputElement>('#lace-password-input') || { value: '' };
    const passwordConfirmInput = document.querySelector<HTMLInputElement>('#lace-password-confirm-input') || {
      value: ''
    };

    return passHasBeenValidated && passwordInput.value !== passwordConfirmInput.value
      ? translations.noMatchPassword
      : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletName]);

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(walletName) ? translations.nameMaxLength : '';
    return walletName ? validationError : translations.nameRequiredMessage;
  }, [walletName, translations.nameMaxLength, translations.nameRequiredMessage]);

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const isNextButtonEnabled = () => true;
  // const isNextButtonEnabled = () => {
  //   const hasMinimumLevelRequired = score >= MINIMUM_PASSWORD_LEVEL_REQUIRED;
  //   const isNotEmptyPassword = secrets.password.length > 0;
  //   const isValidPassword = Boolean(
  //     passHasBeenValidated && !passwordConfirmationErrorMessage && hasMinimumLevelRequired && isNotEmptyPassword
  //   );
  //   const isValidName = Boolean(!walletNameErrorMessage);
  //
  //   return isValidName && isValidPassword;
  // };

  const handleNameChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setWalletName(value);
    setShouldShowNameErrorMessage(true);
    onChange?.({ name: value });
  };

  // const handlePasswordChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
  //   secrets.setPassword(value);
  //   secrets.setPasswordConfirm(value);
  // };

  // const handlePasswordConfirmationChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
  //   setPassHasBeenValidated(true);
  //   setPasswordConfirm(target.value);
  // };

  const handleNextButtonClick = async () => {
    // try {
    setNextButtonLoading(true);
    await onNext({ walletName });
    // } finally {
    //   setNextButtonLoading(false);
    // }
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
          id="lace-password-input"
          label={translations.passwordInputLabel}
          level={score}
          feedbacks={passwordStrengthFeedbackMap[score] && [t(passwordStrengthFeedbackMap[score])]}
          complexityBarList={complexityBarList}
          data-testid="wallet-password-verification-input"
        />
        <WalletPasswordConfirmationInput
          id="lace-password-confirm-input"
          isVisible={score >= MINIMUM_PASSWORD_LEVEL_REQUIRED}
          label={translations.confirmPasswordInputLabel}
          errorMessage={passwordConfirmationErrorMessage}
          shouldShowErrorMessage={!!passwordConfirmationErrorMessage}
        />
      </div>
    </WalletSetupStepLayoutRevamp>
  );
};
