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
    title: t('core.walletNameAndPasswordSetupStep.title'),
    description: t('core.walletNameAndPasswordSetupStep.description'),
    nameInputLabel: t('core.walletNameAndPasswordSetupStep.nameInputLabel'),
    nameMaxLength: t('core.walletNameAndPasswordSetupStep.nameMaxLength'),
    passwordInputLabel: t('core.walletNameAndPasswordSetupStep.passwordInputLabel'),
    confirmPasswordInputLabel: t('core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel'),
    nameRequiredMessage: t('core.walletNameAndPasswordSetupStep.nameRequiredMessage'),
    noMatchPassword: t('core.walletNameAndPasswordSetupStep.noMatchPassword'),
    confirmButton: t('core.walletNameAndPasswordSetupStep.next'),
    secondLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'),
    firstLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback')
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
        history.push(walletRoutePaths.newWallet.create.recoveryPhrase);
      }}
      translations={translations}
    />
  );
};
