import { WalletSetupOptionsStep } from '@lace/core';
import { useAnalyticsContext } from '@providers';
import { walletRoutePaths } from '@routes';
import React from 'react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';

export const Home = (): JSX.Element => {
  const { t: translate } = useTranslation();
  const history = useHistory();
  const analytics = useAnalyticsContext();

  const walletSetupOptionsStepTranslations = {
    title: translate('core.walletSetupOptionsStep.title'),
    subTitle: translate('core.walletSetupOptionsStep.subTitle'),
    newWallet: {
      title: translate('core.walletSetupOptionsStep.newWallet.title'),
      description: translate('core.walletSetupOptionsStep.newWallet.description'),
      button: translate('core.walletSetupOptionsStep.newWallet.button')
    },
    hardwareWallet: {
      title: translate('core.walletSetupOptionsStep.hardwareWallet.title'),
      description: translate('core.walletSetupOptionsStep.hardwareWallet.description'),
      button: translate('core.walletSetupOptionsStep.hardwareWallet.button')
    },
    restoreWallet: {
      title: translate('core.walletSetupOptionsStep.restoreWallet.title'),
      description: translate('core.walletSetupOptionsStep.restoreWallet.description'),
      button: translate('core.walletSetupOptionsStep.restoreWallet.button')
    }
  };

  return (
    <WalletSetupOptionsStep
      onNewWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.create.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newWallet.create);
      }}
      onHardwareWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.hardware.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newWallet.hardware);
      }}
      onRestoreWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.restore.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newWallet.restore);
      }}
      translations={walletSetupOptionsStepTranslations}
    />
  );
};
