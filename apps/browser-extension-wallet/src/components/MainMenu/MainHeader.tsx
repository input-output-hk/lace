import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './MainHeader.module.scss';
import LaceLogoMark from '../../assets/branding/lace-logo-mark.component.svg';
import { useTranslation } from 'react-i18next';
import { walletRoutePaths } from '@routes';

import { DropdownMenu } from '@components/DropdownMenu';
import { ExpandButton } from '@components/ExpandButton';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';
import { NetworkPill } from '@components/NetworkPill';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const MainHeader = (): React.ReactElement => {
  const { t } = useTranslation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const location = useLocation();
  const analytics = useAnalyticsContext();

  const locationBrowserSection = {
    [walletRoutePaths.assets]: BrowserViewSections.HOME,
    [walletRoutePaths.nfts]: BrowserViewSections.NFTS,
    [walletRoutePaths.activity]: BrowserViewSections.TRANSACTION,
    [walletRoutePaths.earn]: BrowserViewSections.STAKING,
    [walletRoutePaths.addressBook]: BrowserViewSections.ADDRESS_BOOK,
    [walletRoutePaths.settings]: BrowserViewSections.SETTINGS
  };

  return (
    <div className={styles.header} data-testid="header-container">
      <div className={styles.content}>
        <Link
          className={styles.linkLogo}
          to={walletRoutePaths.assets}
          data-testid="header-logo"
          onClick={() => analytics.sendEventToPostHog(PostHogAction.WalletLaceClick)}
        >
          <LaceLogoMark className={styles.logo} />
          <NetworkPill />
        </Link>
        <div className={styles.controls}>
          <ExpandButton
            label={t('expandPopup')}
            onClick={() => backgroundServices.handleOpenBrowser({ section: locationBrowserSection[location.pathname] })}
          />
          <DropdownMenu isPopup />
        </div>
      </div>
    </div>
  );
};
