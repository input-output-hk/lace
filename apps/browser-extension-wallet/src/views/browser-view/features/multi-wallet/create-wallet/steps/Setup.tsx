import { WalletSetupNamePasswordStepRevamp } from '@lace/core';
import { useAnalyticsContext } from '@providers';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateWallet } from '../context';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';

export const Setup = (): JSX.Element => {
  const { back, createWalletData, next, onNameAndPasswordChange } = useCreateWallet();
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
    void analytics.sendEventToPostHog(postHogMultiWalletActions.create.ENTER_WALLET);
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
