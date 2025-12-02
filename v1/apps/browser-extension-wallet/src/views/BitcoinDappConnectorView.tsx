import React, { ReactElement, useEffect } from 'react';
import { DappError } from '@src/features/dapp/components/DappError';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';
import { MainLayout } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';

export const BitcoinDappConnectorView = (): ReactElement => {
  const { t } = useTranslation();

  useEffect(() => {
    removePreloaderIfExists();
  }, []);

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

  useEffect(() => {
    if (enhancedAnalyticsStatus !== EnhancedAnalyticsOptInStatus.OptedIn) {
      setDoesUserAllowAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      analytics.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
    }
  }, [analytics, enhancedAnalyticsStatus, setDoesUserAllowAnalytics]);

  return (
    <MainLayout showBetaPill useSimpleHeader hideFooter showAnnouncement={false}>
      <DappError
        title={t('dapp.connector.btc.error.title')}
        description={t('dapp.connector.btc.error.description')}
        closeButtonLabel={t('dapp.connector.btc.error.closeButton')}
        onCloseClick={() => window.close()}
        containerTestId="no-wallet-container"
        imageTestId="no-wallet-image"
        titleTestId="no-wallet-heading"
        descriptionTestId="no-wallet-description"
        closeButtonTestId="create-or-restore-wallet-btn"
      />
    </MainLayout>
  );
};
