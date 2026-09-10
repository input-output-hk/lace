import { useTranslation } from '@lace-contract/i18n';
import { Column, spacing, Text, TextInput } from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';

import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';

const MIN_PASSWORD_LENGTH = 8;

export interface DestinationPasswordStepProps {
  onCancel: () => void;
  onSubmit: (password: string) => void;
  stepLabel?: string;
  stepProgress?: number;
  onBack?: () => void;
}

/**
 * Step 1: create the destination (keeper) wallet. The password chosen here
 * becomes the installation's app-lock password, which the later source import
 * reuses. Rendered inline as a full-screen overlay (not an RN Modal — that
 * recurses inside the global-overlay tree).
 */
export const DestinationPasswordStep = ({
  onCancel,
  onSubmit,
  stepLabel,
  stepProgress,
  onBack,
}: DestinationPasswordStepProps) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isPasswordTooShort =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const arePasswordsMismatched =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(password);
  }, [canSubmit, onSubmit, password]);

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.new-wallet')}
      title={t('migrate-wallet.destination.title')}
      primaryLabel={t('migrate-wallet.destination.submit')}
      onPrimary={handleSubmit}
      primaryDisabled={!canSubmit}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-destination-step">
      <Column gap={spacing.L}>
        <Text.M style={wizardText.bodyLine}>
          {t('migrate-wallet.destination.description')}
        </Text.M>
        <TextInput
          label={t('migrate-wallet.password.label')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          errorMessage={
            isPasswordTooShort
              ? t('migrate-wallet.password.too-short')
              : undefined
          }
          testID="migrate-wallet-password"
        />
        <TextInput
          label={t('migrate-wallet.password.confirm-label')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          errorMessage={
            arePasswordsMismatched
              ? t('migrate-wallet.password.mismatch')
              : undefined
          }
          testID="migrate-wallet-password-confirm"
        />
      </Column>
    </WizardFrame>
  );
};
