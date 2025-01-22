import React, { useEffect, useState } from 'react';

import { AnalyticsConfirmationBanner, WalletAnalyticsInfo, Welcome as View } from '@lace/core';
import { walletRoutePaths } from '@routes';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  EnhancedAnalyticsOptInStatus,
  postHogNamiMigrationActions,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';
import { useAnalyticsContext } from '@providers';
import { useTheme } from '@input-output-hk/lace-ui-toolkit';
import { WarningModal } from '@views/browser/components';

export const Welcome = (): JSX.Element => {
  const history = useHistory();
  const { t: translate } = useTranslation();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );
  const { colorScheme } = useTheme();
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const analytics = useAnalyticsContext();

  useEffect(() => {
    // Send pageview if user already had opted-in before
    analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.INTRODUCTION_STEP);
  }, [analytics]);

  const handleAnalyticsChoice = async (isAccepted: boolean) => {
    const analyticsStatus = isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut;
    setDoesUserAllowAnalytics(analyticsStatus);
    await analytics.setOptedInForEnhancedAnalytics(
      isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut
    );

    await analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.ANALYTICS_AGREE_CLICK, {
      // eslint-disable-next-line camelcase
      $set: { user_tracking_type: isAccepted ? UserTrackingType.Enhanced : UserTrackingType.Basic }
    });
    // Send pageview if user opts-in via banner
    await analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.INTRODUCTION_STEP);
  };

  return (
    <>
      <View
        faqUrl={process.env.FAQ_URL}
        privacyPolicyUrl={process.env.PRIVACY_POLICY_URL}
        termsOfServiceUrl={process.env.TERMS_OF_USE_URL}
        colorScheme={colorScheme}
        onNext={() => history.push(walletRoutePaths.namiMigration.customize)}
      />
      <AnalyticsConfirmationBanner
        message={
          <>
            <span data-testid="analytic-banner-message">{translate('analyticsConfirmationBanner.message')}</span>
            <span
              className={styles.learnMore}
              data-testid="analytic-banner-learn-more"
              onClick={() => {
                setIsAnalyticsModalOpen(true);
              }}
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
        }}
      />
    </>
  );
};
