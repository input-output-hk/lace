import React, { useState } from 'react';

import { AnalyticsConfirmationBanner, Welcome as View } from '@lace/core';
import { walletRoutePaths } from '@routes';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';
import { useTheme } from '@lace/ui';

export const Welcome = (): JSX.Element => {
  const history = useHistory();
  const { t: translate } = useTranslation();
  const [, setIsAnalyticsModalOpen] = useState(false);
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );
  const { colorScheme } = useTheme();

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
              onClick={() => {
                setIsAnalyticsModalOpen(true);
              }}
              data-testid="analytic-banner-learn-more"
            >
              {translate('analyticsConfirmationBanner.learnMore')}
            </span>
          </>
        }
        onConfirm={() => setIsAnalyticsModalOpen(true)}
        onReject={() => setIsAnalyticsModalOpen(false)}
        show={enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet}
      />
    </>
  );
};
