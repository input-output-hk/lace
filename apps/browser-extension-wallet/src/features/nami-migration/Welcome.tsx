import React, { useEffect } from 'react';

import { Welcome as View } from '@lace/core';
import { walletRoutePaths } from '@routes';
import { useHistory } from 'react-router-dom';
import {
  EnhancedAnalyticsOptInStatus,
  postHogNamiMigrationActions
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { useAnalyticsContext } from '@providers';
import { useTheme } from '@input-output-hk/lace-ui-toolkit';

export const Welcome = (): JSX.Element => {
  const history = useHistory();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );
  const [, { updateLocalStorage: setDoesUserAcknowledgePPUdate }] = useLocalStorage(
    'hasUserAcknowledgedPrivacyPolicyUpdate',
    false
  );
  const { colorScheme } = useTheme();

  const analytics = useAnalyticsContext();

  useEffect(() => {
    // Send pageview if user already had opted-in before
    analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.INTRODUCTION_STEP);
  }, [analytics]);

  useEffect(() => {
    if (enhancedAnalyticsStatus !== EnhancedAnalyticsOptInStatus.OptedIn) {
      setDoesUserAllowAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      analytics.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
    }
  }, [analytics, enhancedAnalyticsStatus, setDoesUserAcknowledgePPUdate, setDoesUserAllowAnalytics]);

  return (
    <View
      faqUrl={process.env.FAQ_URL}
      privacyPolicyUrl={process.env.PRIVACY_POLICY_URL}
      termsOfServiceUrl={process.env.TERMS_OF_USE_URL}
      colorScheme={colorScheme}
      onNext={() => {
        setDoesUserAcknowledgePPUdate(true);
        history.push(walletRoutePaths.namiMigration.customize);
      }}
    />
  );
};
