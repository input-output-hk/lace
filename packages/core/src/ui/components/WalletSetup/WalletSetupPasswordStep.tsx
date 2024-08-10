import React, { useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import styles from './WalletSetupPasswordStep.module.scss';
import {
  complexityLevels,
  OnPasswordChange,
  Password,
  PasswordVerification,
  PasswordVerificationProps
} from '@lace/common';
import { TranslationsFor } from '@ui/utils/types';
import { passwordComplexity } from '@src/ui/utils/password-complexity';

type BarStates = PasswordVerificationProps['complexityBarList'];

const minimumPassLevelRequired = 3;

const getComplexityBarStateList = (score: number) => [
  {
    isActive: true,
    'data-testid': 'complexity-bar-1'
  },
  {
    isActive: score > complexityLevels.low,
    'data-testid': 'complexity-bar-2'
  },
  {
    isActive: score > complexityLevels.mid,
    'data-testid': 'complexity-bar-3'
  },
  {
    isActive: score === complexityLevels.veryHigh,
    'data-testid': 'complexity-bar-4'
  }
];
interface WalletSetupRegisterSubmitParams {
  password: string;
}

export interface WalletSetupPasswordStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupRegisterSubmitParams) => void;
  getFeedbackTranslations: (keys: string[]) => string[];
  translations: TranslationsFor<
    'title' | 'description' | 'password' | 'confirmPassword' | 'validationMessage' | 'noMatchPassword'
  >;
}

export const WalletSetupPasswordStep = ({
  onBack,
  onNext,
  translations,
  getFeedbackTranslations
}: WalletSetupPasswordStepProps): React.ReactElement => {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passHasBeenValidated, setPassHasBeenValidated] = useState<boolean>(false);

  const { feedbackKeys, score } = useMemo(() => passwordComplexity(password), [password]);
  const feedbackTranslation = useMemo(
    () => getFeedbackTranslations(feedbackKeys),
    [feedbackKeys, getFeedbackTranslations]
  );

  const passwordConfirmationErrorMessage =
    passHasBeenValidated && password !== passwordConfirmation ? translations.noMatchPassword : '';
  const isNextEnabled = Boolean(
    passHasBeenValidated &&
      !passwordConfirmationErrorMessage &&
      score >= minimumPassLevelRequired &&
      password.length > 0
  );

  const complexityBarList: BarStates = useMemo(() => getComplexityBarStateList(score), [score]);

  const handlePasswordConfirmationChange: OnPasswordChange = (target) => {
    setPassHasBeenValidated(true);
    setPasswordConfirmation(target.value);
  };

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      onBack={onBack}
      onNext={() => {
        onNext({ password });
      }}
      isNextEnabled={isNextEnabled}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
    >
      <div className={styles.walletSetupPasswordStep}>
        <PasswordVerification
          className={styles.input}
          label={translations.password}
          onChange={(e) => setPassword(e.value)}
          level={score}
          feedbacks={feedbackTranslation}
          complexityBarList={complexityBarList}
          data-testid="wallet-setup-password-step-password"
          autoFocus
        />
        <div style={{ position: 'relative' }}>
          <Password
            className={styles.input}
            errorMessage={passwordConfirmationErrorMessage}
            label={translations.confirmPassword}
            onChange={handlePasswordConfirmationChange}
            data-testid="wallet-setup-password-step-confirm-password"
          />
          {!!passwordConfirmationErrorMessage && (
            <p className={styles.error} data-testid="wallet-setup-register-password-conf-error">
              {passwordConfirmationErrorMessage}
            </p>
          )}
        </div>
      </div>
    </WalletSetupStepLayout>
  );
};
