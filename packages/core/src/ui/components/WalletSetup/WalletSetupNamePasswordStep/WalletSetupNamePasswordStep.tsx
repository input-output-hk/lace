import React, { useMemo, useState } from 'react';
import cn from 'classnames';
import { WalletSetupStepLayout, WalletTimelineSteps } from '../WalletSetupStepLayout';
import { Password, PasswordVerification, Input } from '@lace/common';
import { passwordComplexity } from '@src/ui/utils/password-complexity';
import { useTranslate } from '@src/ui/hooks';

import { BarStates, WalletSetupNamePasswordSubmitParams } from './types';
import styles from './WalletSetupNamePasswordStep.module.scss';
import {
  getComplexityBarStateList,
  MINIMUM_PASSWORD_LEVEL_REQUIRED,
  PASSWORD_LEVEL_FEEDBACK,
  validateNameLength,
  WALLET_NAME_INPUT_MAX_LENGTH
} from './utils';

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

  const handleNextBtnClick = () => {
    onNext({ walletName, password });
  };

  return (
    <WalletSetupStepLayout
      title={t('package.core.walletNameAndPasswordSetupStep.title')}
      description={t('package.core.walletNameAndPasswordSetupStep.description')}
      onBack={onBack}
      onNext={handleNextBtnClick}
      isNextEnabled={isNextButtonEnabled()}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
    >
      <div className={styles.walletSetupNamePasswordStep}>
        <div>
          <Input
            dataTestId="wallet-setup-register-name-input"
            value={walletName}
            label={t('package.core.walletNameAndPasswordSetupStep.nameInputLabel')}
            onChange={handleNameChange}
            maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
            className={styles.paddingLeft}
          />
          {shouldShowNameErrorMessage && (
            <p
              className={cn(styles.label, { [styles.error]: shouldShowNameErrorMessage })}
              data-testid="wallet-setup-register-name-error"
            >
              {walletNameErrorMessage}
            </p>
          )}
        </div>
        <PasswordVerification
          className={styles.input}
          value={password}
          label={t('package.core.walletNameAndPasswordSetupStep.passwordInputLabel')}
          onChange={handlePasswordChange}
          level={score}
          feedbacks={
            score === PASSWORD_LEVEL_FEEDBACK && [
              t('package.core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback')
            ]
          }
          complexityBarList={complexityBarList}
          data-testid="wallet-password-verification-input"
          autoFocus
        />

        <div
          className={cn(styles.confirmPasswordContainer, {
            [styles.displayed]: score >= MINIMUM_PASSWORD_LEVEL_REQUIRED
          })}
        >
          <Password
            className={styles.input}
            errorMessage={passwordConfirmationErrorMessage}
            value={passwordConfirmation}
            label={t('package.core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel')}
            onChange={handlePasswordConfirmationChange}
            data-testid="wallet-setup-password-step-confirm-password"
          />
          {!!passwordConfirmationErrorMessage && (
            <p
              className={cn(styles.label, { [styles.error]: shouldShowNameErrorMessage })}
              data-testid="wallet-setup-register-password-conf-error"
            >
              {passwordConfirmationErrorMessage}
            </p>
          )}
        </div>
      </div>
    </WalletSetupStepLayout>
  );
};
