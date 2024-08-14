import React, { useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from '../WalletSetupStepLayout';
import { OnPasswordChange } from '@ui/components/Password';
import { PasswordVerification } from '@ui/components/PasswordVerification';
import { passwordComplexity } from '@src/ui/utils/password-complexity';
import { BarStates, LegacyWalletSetupNamePasswordSubmitParams } from './types';
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
import { TranslationsFor } from '@ui/utils/types';
import { useTranslation } from 'react-i18next';

export interface WalletSetupNamePasswordStepProps {
  onBack: () => void;
  onNext: (params: LegacyWalletSetupNamePasswordSubmitParams) => void;
  initialWalletName?: string;
  onChange?: (state: { name: string; password: string }) => void;
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

export const WalletSetupNamePasswordStep = ({
  onBack,
  onNext,
  initialWalletName = INITIAL_WALLET_NAME,
  onChange,
  translations
}: WalletSetupNamePasswordStepProps): React.ReactElement => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passHasBeenValidated, setPassHasBeenValidated] = useState<boolean>(false);

  const [walletName, setWalletName] = useState(initialWalletName);
  const [shouldShowNameErrorMessage, setShouldShowNameErrorMessage] = useState(false);

  const { score } = useMemo(() => passwordComplexity(password), [password]);

  const complexityBarList: BarStates = useMemo(() => getComplexityBarStateList(score), [score]);

  const passwordConfirmationErrorMessage =
    passHasBeenValidated && password !== passwordConfirmation ? translations.noMatchPassword : '';

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(walletName) ? translations.nameMaxLength : '';
    return walletName ? validationError : translations.nameRequiredMessage;
  }, [walletName, translations.nameMaxLength, translations.nameRequiredMessage]);

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
    onChange?.({ name: value, password });
  };

  const handlePasswordChange: OnPasswordChange = (target) => {
    setPassword(target.value);
    onChange?.({ password: target.value, name: walletName });
  };

  const handlePasswordConfirmationChange: OnPasswordChange = (target) => {
    setPassHasBeenValidated(true);
    setPasswordConfirmation(target.value);
  };

  const handleNextButtonClick = () => {
    onNext({ walletName });
  };

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      onBack={onBack}
      onNext={handleNextButtonClick}
      isNextEnabled={isNextButtonEnabled()}
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
          showComplexity={!!password}
        />
        <WalletPasswordConfirmationInput
          isVisible={score >= MINIMUM_PASSWORD_LEVEL_REQUIRED}
          onChange={handlePasswordConfirmationChange}
          label={translations.confirmPasswordInputLabel}
          errorMessage={passwordConfirmationErrorMessage}
          shouldShowErrorMessage={!!passwordConfirmationErrorMessage}
        />
      </div>
    </WalletSetupStepLayout>
  );
};
