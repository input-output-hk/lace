import React, { ReactElement, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { WalletSetupLayout, WarningModal } from '@views/browser/components';
import { AnalyticsConfirmationBanner, WalletAnalyticsInfo, WalletSetupOptionsStepRevamp } from '@lace/core';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';
import { walletRoutePaths } from '@routes';
import {
  EnhancedAnalyticsOptInStatus,
  PostHogAction,
  postHogOnboardingActions,
  PostHogProperties,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { useHistory } from 'react-router-dom';

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL;
const TERMS_OF_USE_URL = process.env.TERMS_OF_USE_URL;

export const WalletSetupMainPage = (): ReactElement => {
  const history = useHistory();
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const { t: translate } = useTranslation();

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
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
      button: translate('core.walletSetupOptionsStep.hardwareWallet.button')
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
    history.push(walletRoutePaths.setup.hardware);
    analytics.sendEventToPostHog(postHogOnboardingActions.hw?.SETUP_OPTION_CLICK);
  };

  const sendAnalytics = async (args: { postHogAction: PostHogAction; postHogProperties?: PostHogProperties }) => {
    await analytics.sendEventToPostHog(args.postHogAction, args?.postHogProperties);
  };

  const handleAnalyticsChoice = async (isAccepted: boolean) => {
    const analyticsStatus = isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut;
    setDoesUserAllowAnalytics(analyticsStatus);
    await analytics.setOptedInForEnhancedAnalytics(
      isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut
    );

    const postHogAnalyticsAgreeAction = postHogOnboardingActions.onboarding.ANALYTICS_AGREE_CLICK;
    const postHogAnalyticsRejectAction = postHogOnboardingActions.onboarding.ANALYTICS_REJECT_CLICK;

    const postHogAction = isAccepted ? postHogAnalyticsAgreeAction : postHogAnalyticsRejectAction;
    const postHogProperties = {
      // eslint-disable-next-line camelcase
      $set: { user_tracking_type: isAccepted ? UserTrackingType.Enhanced : UserTrackingType.Basic }
    };
    await sendAnalytics({ postHogAction, postHogProperties });
  };

  const handleRestoreWallet = () => {
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.SETUP_OPTION_CLICK);
    history.push(walletRoutePaths.setup.restore);
  };

  const handleCreateNewWallet = () => {
    sendAnalytics({
      postHogAction: postHogOnboardingActions.create.SETUP_OPTION_CLICK
    });
    history.push(walletRoutePaths.setup.create);
  };

  return (
    <>
      <WalletSetupLayout>
        <WalletSetupOptionsStepRevamp
          onNewWalletRequest={handleCreateNewWallet}
          onHardwareWalletRequest={handleStartHardwareOnboarding}
          onRestoreWalletRequest={handleRestoreWallet}
          translations={walletSetupOptionsStepTranslations}
        />
      </WalletSetupLayout>
      <AnalyticsConfirmationBanner
        message={
          <>
            <span data-testid="analytic-banner-message">{translate('analyticsConfirmationBanner.message')}</span>
            <span
              className={styles.learnMore}
              onClick={() => {
                setIsAnalyticsModalOpen(true);
                sendAnalytics({
                  postHogAction: postHogOnboardingActions.onboarding.LEARN_MORE_CLICK
                });
              }}
              data-testid="analytic-banner-learn-more"
            >
              {translate('analyticsConfirmationBanner.learnMore')}
            </span>
          </>
        }
        onConfirm={() => handleAnalyticsChoice(true)}
        onReject={() => handleAnalyticsChoice(false)}
        show={enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet}
      />
      <WarningModal
        header={<div className={styles.analyticsModalTitle}>{translate('core.walletAnalyticsInfo.title')}</div>}
        content={<WalletAnalyticsInfo />}
        visible={isAnalyticsModalOpen}
        confirmLabel={translate('core.walletAnalyticsInfo.gotIt')}
        onConfirm={() => {
          setIsAnalyticsModalOpen(false);
          sendAnalytics({
            postHogAction: postHogOnboardingActions.onboarding.GOT_IT_CLICK
          });
        }}
      />
    </>
  );
};
