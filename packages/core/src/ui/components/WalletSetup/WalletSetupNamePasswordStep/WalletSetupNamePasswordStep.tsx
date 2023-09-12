import React, { useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from '../WalletSetupStepLayout';
import { PasswordVerification } from '@lace/common';
import { passwordComplexity } from '@src/ui/utils/password-complexity';
import { useTranslate } from '@src/ui/hooks';

import { BarStates, WalletSetupNamePasswordSubmitParams } from './types';
import styles from './styles.module.scss';
import {
  getComplexityBarStateList,
  MINIMUM_PASSWORD_LEVEL_REQUIRED,
  passwordStrengthFeedbackMap,
  validateNameLength,
  WALLET_NAME_INPUT_MAX_LENGTH
} from './utils';
import { WalletNameInput } from './WalletNameInput';
import { WalletPasswordConfirmationInput } from './WalletPasswordConfirmationInput';

export interface WalletSetupNamePasswordStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupNamePasswordSubmitParams) => void;
  initialWalletName?: string;
}

export const WalletSetupNamePasswordStep = ({
  onBack,
  onNext,
  initialWalletName = ''
}: WalletSetupNamePasswordStepProps): React.ReactElement => {
  const { t } = useTranslate();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passHasBeenValidated, setPassHasBeenValidated] = useState<boolean>(false);
  const [walletName, setWalletName] = useState(initialWalletName);
  const [shouldShowNameErrorMessage, setShouldShowNameErrorMessage] = useState(false);

  const { score } = useMemo(() => passwordComplexity(password), [password]);

  const complexityBarList: BarStates = useMemo(() => getComplexityBarStateList(score), [score]);

  const passwordConfirmationErrorMessage =
    passHasBeenValidated && password !== passwordConfirmation
      ? t('package.core.walletNameAndPasswordSetupStep.noMatchPassword')
      : '';

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(walletName)
      ? t('package.core.walletNameAndPasswordSetupStep.nameMaxLength')
      : '';
    return walletName ? validationError : t('package.core.walletNameAndPasswordSetupStep.nameRequiredMessage');
  }, [t, walletName]);

  const isNextButtonEnabled = () => {
    const hasMinimumLevelRequired = score >= MINIMUM_PASSWORD_LEVEL_REQUIRED;
    const isNotEmptyPassword = password.length > 0;
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

  const handlePasswordChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(value);
  };

  const handlePasswordConfirmationChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setPassHasBeenValidated(true);
    setPasswordConfirmation(target.value);
  };

  const handleNextButtonClick = () => {
    onNext({ walletName, password });
  };

  return (
    <WalletSetupStepLayout
      title={t('package.core.walletNameAndPasswordSetupStep.title')}
      description={t('package.core.walletNameAndPasswordSetupStep.description')}
      onBack={onBack}
      onNext={handleNextButtonClick}
      isNextEnabled={isNextButtonEnabled()}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
    >
      <div className={styles.walletPasswordAndNameContainer}>
        <WalletNameInput
          value={walletName}
          label={t('package.core.walletNameAndPasswordSetupStep.nameInputLabel')}
          onChange={handleNameChange}
          maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
          shouldShowErrorMessage={shouldShowNameErrorMessage}
          errorMessage={walletNameErrorMessage}
        />
        <PasswordVerification
          className={styles.input}
          value={password}
          label={t('package.core.walletNameAndPasswordSetupStep.passwordInputLabel')}
          onChange={handlePasswordChange}
          level={score}
          feedbacks={passwordStrengthFeedbackMap[score] && [t(passwordStrengthFeedbackMap[score])]}
          complexityBarList={complexityBarList}
          data-testid="wallet-password-verification-input"
        />
        <WalletPasswordConfirmationInput
          isVisible={score >= MINIMUM_PASSWORD_LEVEL_REQUIRED}
          value={passwordConfirmation}
          onChange={handlePasswordConfirmationChange}
          label={t('package.core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel')}
          errorMessage={passwordConfirmationErrorMessage}
          shouldShowErrorMessage={!!passwordConfirmationErrorMessage}
        />
      </div>
    </WalletSetupStepLayout>
  );
};
