import { WalletSetupNamePasswordStepRevamp, WalletSetupNamePasswordSubmitParams } from '@lace/core';
import { useAnalyticsContext } from '@providers';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateWallet } from '../context';
import { useWalletOnboarding } from '../../walletOnboardingContext';

export const Setup = (): JSX.Element => {
  const { postHogActions } = useWalletOnboarding();
  const { back, createWalletData, next, recoveryMethod } = useCreateWallet();
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
    confirmButton:
      recoveryMethod === 'mnemonic'
        ? t('core.walletNameAndPasswordSetupStep.enterWallet')
        : t('core.walletNameAndPasswordSetupStep.generatePaperWallet'), // If using paper wallet, there is another required step before entering the wallet
    secondLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'),
    firstLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback')
  };

  const onNext = async ({ walletName }: WalletSetupNamePasswordSubmitParams) => {
    if (recoveryMethod === 'mnemonic') {
      void analytics.sendEventToPostHog(postHogActions.create.ENTER_WALLET);
    }
    void analytics.sendEventToPostHog(postHogActions.create.WALLET_SETUP_GENERATE_PAPER_WALLET_CLICK);
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
