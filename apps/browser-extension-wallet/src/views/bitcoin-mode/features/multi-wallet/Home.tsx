import { WalletSetupOptionsStep } from '@lace/core';
import { useAnalyticsContext } from '@providers';
import { walletRoutePaths } from '@routes';
import React from 'react';
import { useHistory } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL;
const TERMS_OF_USE_URL = process.env.TERMS_OF_USE_URL;

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
      button: translate('core.walletSetupOptionsStep.hardwareWallet.button'),
      tooltip: translate('core.walletSetupOptionsStep.hardwareWallet.tooltip')
    },
    restoreWallet: {
      title: translate('core.walletSetupOptionsStep.restoreWallet.title'),
      description: translate('core.walletSetupOptionsStep.restoreWallet.description'),
      button: translate('core.walletSetupOptionsStep.restoreWallet.button')
    },
    agreementText: (
      <Trans
        i18nKey="core.walletSetupOptionsStep.agreementText"
        components={{
          a1: (
            <a
              href={TERMS_OF_USE_URL}
              target="_blank"
              className={styles.link}
              data-testid="agreement-terms-of-service-link"
              rel="noreferrer"
            />
          ),
          a2: (
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              className={styles.link}
              data-testid="agreement-privacy-policy-link"
              rel="noreferrer"
            />
          )
        }}
      />
    )
  };

  return (
    <WalletSetupOptionsStep
      onNewWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.create.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newBitcoinWallet.create);
      }}
      onHardwareWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.hardware.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newBitcoinWallet.hardware);
      }}
      onRestoreWalletRequest={() => {
        void analytics.sendEventToPostHog(postHogMultiWalletActions.restore.SETUP_OPTION_CLICK);
        history.push(walletRoutePaths.newBitcoinWallet.restore);
      }}
      translations={walletSetupOptionsStepTranslations}
      withHardwareWallet={false}
    />
  );
};
