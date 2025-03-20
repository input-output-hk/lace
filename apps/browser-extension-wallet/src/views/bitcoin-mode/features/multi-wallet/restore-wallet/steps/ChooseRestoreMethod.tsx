import React, { VFC } from 'react';
import { useRestoreWallet } from '../context';
import { i18n } from '@lace/translation';

import { Trans } from 'react-i18next';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers';
import { ChooseRecoveryMethodBase } from '../../create-wallet/steps/ChooseRecoveryMethod';

const FAQ_URL = `${process.env.FAQ_URL}?question=what-is-paper-wallet`;

export const ChooseRestoreMethod: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const { back, next, recoveryMethod, setRecoveryMethod } = useRestoreWallet();
  const analytics = useAnalyticsContext();

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.CHOOSE_RECOVERY_MODE_NEXT_CLICK);
    next();
  };

  return (
    <ChooseRecoveryMethodBase
      title={i18n.t('paperWallet.chooseRestoreMethod.title')}
      description={
        <Trans
          i18nKey="paperWallet.chooseRestoreMethod.description"
          components={{
            a: <a href={FAQ_URL} target="_blank" rel="noopener noreferrer" data-testid="faq-what-is-paper-wallet-url" />
          }}
        />
      }
      back={back}
      handleNext={handleNext}
      recoveryMethod={recoveryMethod}
      setRecoveryMethod={setRecoveryMethod}
      flow="create"
    />
  );
};
