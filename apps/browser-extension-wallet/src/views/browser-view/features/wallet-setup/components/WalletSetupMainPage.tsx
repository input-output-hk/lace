import React, { ReactElement, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { WalletSetupOptionsStep } from '@lace/core';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';
import { walletRoutePaths } from '@routes';
import { EnhancedAnalyticsOptInStatus, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { useHistory } from 'react-router-dom';

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL;
const TERMS_OF_USE_URL = process.env.TERMS_OF_USE_URL;

export const WalletSetupMainPage = (): ReactElement => {
  const history = useHistory();
  const { t: translate } = useTranslation();

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );
  const [, { updateLocalStorage: setDoesUserAcknowledgePPUdate }] = useLocalStorage(
    'hasUserAcknowledgedPrivacyPolicyUpdate',
    false
  );

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

  const handleStartHardwareOnboarding = () => {
    setDoesUserAcknowledgePPUdate(true);
    history.push(walletRoutePaths.setup.hardware);
    analytics.sendEventToPostHog(postHogOnboardingActions.hw?.SETUP_OPTION_CLICK);
  };

  useEffect(() => {
    if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet) {
      setDoesUserAllowAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      analytics.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
    }
  }, [analytics, enhancedAnalyticsStatus, setDoesUserAcknowledgePPUdate, setDoesUserAllowAnalytics]);

  const handleRestoreWallet = () => {
    setDoesUserAcknowledgePPUdate(true);
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.SETUP_OPTION_CLICK);
    history.push(walletRoutePaths.setup.restore);
  };

  const handleCreateNewWallet = () => {
    setDoesUserAcknowledgePPUdate(true);
    analytics.sendEventToPostHog(postHogOnboardingActions.create.SETUP_OPTION_CLICK);
    history.push(walletRoutePaths.setup.create);
  };

  return (
    <WalletSetupOptionsStep
      onNewWalletRequest={handleCreateNewWallet}
      onHardwareWalletRequest={handleStartHardwareOnboarding}
      onRestoreWalletRequest={handleRestoreWallet}
      translations={walletSetupOptionsStepTranslations}
      withAgreement
      withHardwareWallet
    />
  );
};
