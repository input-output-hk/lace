import { WalletSetupNamePasswordStepRevamp } from '@lace/core';
import React from 'react';
import { useRestoreWallet } from '../context';
import { useTranslation } from 'react-i18next';
import { PostHogAction, toast } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';

export const Setup = (): JSX.Element => {
  const { back, concludeWalletAdd, createWalletData, next, onNameAndPasswordChange } = useRestoreWallet();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const translations = {
    title: t('core.walletNameAndPasswordSetupStep.title'),
    description: t('core.walletNameAndPasswordSetupStep.description'),
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

  const onNext = async () => {
    void analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreWalletNamePasswordNextClick);

    try {
      await concludeWalletAdd();
    } catch (error) {
      if (error instanceof WalletConflictError) {
        toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
      } else {
        throw error;
      }
    }

    await next();
  };

  return (
    <WalletSetupNamePasswordStepRevamp
      initialWalletName={createWalletData.name}
      onChange={onNameAndPasswordChange}
      onBack={back}
      onNext={onNext}
      translations={translations}
    />
  );
};
