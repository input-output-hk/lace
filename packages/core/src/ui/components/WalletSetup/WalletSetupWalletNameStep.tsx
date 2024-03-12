import React, { ChangeEvent, useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { Input } from '@lace/common';
import styles from './WalletSetupRegisterStep.module.scss';
import { TranslationsFor } from '@ui/utils/types';

const nameShouldHaveRightLengthRegex = /^.{1,20}$/;

const validateName = (name: string) => nameShouldHaveRightLengthRegex.test(name);

export interface WalletSetupWalletNameStepProps {
  onBack: () => void;
  onNext: (walletName: string) => void;
  translations: TranslationsFor<'maxCharacters' | 'nameYourWallet' | 'create' | 'walletName' | 'chooseName'>;
  isHardwareWallet?: boolean;
  onChange?: (name: string) => void;
}

export const WalletSetupWalletNameStep = ({
  onBack,
  onNext,
  translations,
  isHardwareWallet = false,
  onChange
}: WalletSetupWalletNameStepProps): React.ReactElement => {
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [walletName, setWalletName] = useState('');
  const isNameValid = useMemo(() => validateName(walletName), [walletName]);
  const validationError = useMemo(
    () => !isNameValid && translations.maxCharacters,
    [isNameValid, translations.maxCharacters]
  );

  const onSubmit = async () => {
    setIsCreating(true);
    setIsDirty(true);
    isNameValid && onNext(walletName);
    setIsCreating(false);
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    setWalletName(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <WalletSetupStepLayout
      title={translations.nameYourWallet}
      onBack={onBack}
      isNextEnabled={!!walletName && !validationError}
      onNext={onSubmit}
      nextLabel={translations.create}
      isNextLoading={isCreating}
      currentTimelineStep={isHardwareWallet ? WalletTimelineSteps.NAME_WALLET : WalletTimelineSteps.WALLET_SETUP}
      isHardwareWallet={isHardwareWallet}
    >
      <p className={styles.subtitle}>{translations.chooseName}</p>
      <Input
        dataTestId="wallet-setup-register-name-input"
        className={styles.inputName}
        label={translations.walletName}
        value={walletName}
        onChange={handleNameChange}
        autoFocus
      />
      {isDirty && walletName && !isNameValid && (
        <p className={styles.formError} data-testid="wallet-setup-register-name-error">
          {validationError}
        </p>
      )}
    </WalletSetupStepLayout>
  );
};
