import { WalletSetupNamePasswordStep } from '@lace/core';
import { walletRoutePaths } from '@routes';
import React from 'react';
import { useHistory } from 'react-router';
import { useCreateWallet } from '../context';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword, onChange, data } = useCreateWallet();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const translations = {
    title: t('package.core.walletNameAndPasswordSetupStep.title'),
    description: t('package.core.walletNameAndPasswordSetupStep.description'),
    nameInputLabel: t('package.core.walletNameAndPasswordSetupStep.nameInputLabel'),
    nameMaxLength: t('package.core.walletNameAndPasswordSetupStep.nameMaxLength'),
    passwordInputLabel: t('package.core.walletNameAndPasswordSetupStep.passwordInputLabel'),
    confirmPasswordInputLabel: t('package.core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel'),
    nameRequiredMessage: t('package.core.walletNameAndPasswordSetupStep.nameRequiredMessage'),
    noMatchPassword: t('package.core.walletNameAndPasswordSetupStep.noMatchPassword'),
    confirmButton: t('package.core.walletNameAndPasswordSetupStep.next'),
    secondLevelPasswordStrengthFeedback: t(
      'package.core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'
    ),
    firstLevelPasswordStrengthFeedback: t(
      'package.core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback'
    )
  };

  return (
    <WalletSetupNamePasswordStep
      initialWalletName={data.name}
      onChange={onChange}
      onBack={() => history.push(walletRoutePaths.newWallet.root)}
      onNext={({ password, walletName }) => {
        analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateWalletNamePasswordNextClick);
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.create.keepSecure);
      }}
      translations={translations}
    />
  );
};
