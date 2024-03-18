import { WalletSetupNamePasswordStep } from '@lace/core';
import React from 'react';
import { useHistory } from 'react-router';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes/wallet-paths';
import { useTranslation } from 'react-i18next';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword, onChange, data } = useRestoreWallet();
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
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.restore.keepSecure);
      }}
      translations={translations}
    />
  );
};
