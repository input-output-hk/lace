import { WalletSetupNamePasswordStepRevamp, WalletSetupNamePasswordSubmitParams } from '@lace/core';
import React from 'react';
import { useRestoreWallet } from '../context';
import { useTranslation } from 'react-i18next';
import { toast } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { useWalletOnboarding } from '../../walletOnboardingContext';

export const Setup = (): JSX.Element => {
  const { back, createWalletData, finalizeWalletRestoration, next } = useRestoreWallet();
  const analytics = useAnalyticsContext();
  const { forgotPasswordFlowActive, postHogActions } = useWalletOnboarding();
  const { t } = useTranslation();

  const translations = {
    title: forgotPasswordFlowActive
      ? t('core.walletNameAndPasswordSetupStep.forgotPasswordTitle')
      : t('core.walletNameAndPasswordSetupStep.title'),
    description: forgotPasswordFlowActive
      ? t('core.walletNameAndPasswordSetupStep.forgotPasswordSubtitle')
      : t('core.walletNameAndPasswordSetupStep.description'),
    nameInputLabel: t('core.walletNameAndPasswordSetupStep.nameInputLabel'),
    nameMaxLength: t('core.walletNameAndPasswordSetupStep.nameMaxLength'),
    passwordInputLabel: t('core.walletNameAndPasswordSetupStep.passwordInputLabel'),
    confirmPasswordInputLabel: t('core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel'),
    nameRequiredMessage: t('core.walletNameAndPasswordSetupStep.nameRequiredMessage'),
    noMatchPassword: t('core.walletNameAndPasswordSetupStep.noMatchPassword'),
    confirmButton: t('core.walletNameAndPasswordSetupStep.enterWallet'),
    secondLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'),
    firstLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback')
  };

  const onNext = async ({ walletName }: WalletSetupNamePasswordSubmitParams) => {
    void analytics.sendEventToPostHog(postHogActions.restore.ENTER_WALLET);
    try {
      await finalizeWalletRestoration({ name: walletName });
    } catch (error) {
      if (error instanceof WalletConflictError) {
        toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
      } else {
        throw error;
      }
    }

    await next({ name: walletName });
  };

  return (
    <WalletSetupNamePasswordStepRevamp
      initialWalletName={createWalletData.name}
      onBack={back}
      onNext={onNext}
      translations={translations}
    />
  );
};
