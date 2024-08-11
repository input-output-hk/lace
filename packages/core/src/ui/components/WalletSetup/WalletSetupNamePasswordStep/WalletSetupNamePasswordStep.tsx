import React, { useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from '../WalletSetupStepLayout';
import { PasswordVerification } from '@lace/common';
import { passwordComplexity } from '@src/ui/utils/password-complexity';
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
// import { WalletPasswordConfirmationInput } from './WalletPasswordConfirmationInput';
import { TranslationsFor } from '@ui/utils/types';
import { useTranslation } from 'react-i18next';

export interface WalletSetupNamePasswordStepProps {
  onBack: () => void;
  onNext: (params: WalletSetupNamePasswordSubmitParams) => void;
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
  // const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordConfirmation] = useState('');
  // const [passHasBeenValidated, setPassHasBeenValidated] = useState<boolean>(false);
  const [passHasBeenValidated] = useState<boolean>(false);

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

  const handlePasswordChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(value);
    onChange?.({ password: value, name: walletName });
  };

  // const handlePasswordConfirmationChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
  //   setPassHasBeenValidated(true);
  //   setPasswordConfirmation(target.value);
  // };

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
          id="dead-code"
          value={password}
          label={translations.passwordInputLabel}
          onChange={handlePasswordChange}
          level={score}
          feedbacks={passwordStrengthFeedbackMap[score] && [t(passwordStrengthFeedbackMap[score])]}
          complexityBarList={complexityBarList}
          data-testid="wallet-password-verification-input"
        />
        {/* <WalletPasswordConfirmationInput */}
        {/*   isVisible={score >= MINIMUM_PASSWORD_LEVEL_REQUIRED} */}
        {/*   value={passwordConfirmation} */}
        {/*   onChange={handlePasswordConfirmationChange} */}
        {/*   label={translations.confirmPasswordInputLabel} */}
        {/*   errorMessage={passwordConfirmationErrorMessage} */}
        {/*   shouldShowErrorMessage={!!passwordConfirmationErrorMessage} */}
        {/* /> */}
      </div>
    </WalletSetupStepLayout>
  );
};
