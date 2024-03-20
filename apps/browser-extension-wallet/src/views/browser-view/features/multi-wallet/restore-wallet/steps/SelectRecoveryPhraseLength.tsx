import { WalletSetupRecoveryPhraseLengthStep } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

const {
  newWallet: { restore }
} = walletRoutePaths;

export const SelectRecoveryPhraseLength = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { setLength } = useRestoreWallet();
  const analytics = useAnalyticsContext();

  const walletSetupRecoveryPhraseLengthStepTranslations = {
    title: t('core.walletSetupRecoveryPhraseLengthStep.title'),
    description: t('core.walletSetupRecoveryPhraseLengthStep.description'),
    wordPassphrase: t('core.walletSetupRecoveryPhraseLengthStep.wordPassphrase')
  };

  return (
    <WalletSetupRecoveryPhraseLengthStep
      onBack={() => history.goBack()}
      onNext={({ recoveryPhraseLength }) => {
        analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreRecoveryPhraseLengthNextClick);
        setLength(recoveryPhraseLength);
        history.push(restore.enterRecoveryPhrase);
      }}
      translations={walletSetupRecoveryPhraseLengthStepTranslations}
    />
  );
};
