import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './MainHeader.module.scss';
import LaceLogoMark from '../../../../assets/branding/lace-logo-beta-white.component.svg';
import LaceLogoMarkDark from '../../../../assets/branding/lace-logo-beta-dark.component.svg';
import { walletRoutePaths } from '../../wallet-paths';
import classNames from 'classnames';

import { DropdownMenu } from '@components/DropdownMenu';
import { ExpandButton } from '@components/ExpandButton';
import { NetworkPill } from '@components/NetworkPill';
import { useAnalyticsContext, useBackgroundServiceAPIContext, useTheme } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useTranslation } from 'react-i18next';
import { BrowserViewSections } from '@lib/scripts/types';

export const MainHeader = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const backgroundServices = useBackgroundServiceAPIContext();
  const location = useLocation();
  const { theme } = useTheme();

  const locationBrowserSection = {
    [walletRoutePaths.assets]: BrowserViewSections.HOME,
    [walletRoutePaths.nfts]: BrowserViewSections.NFTS,
    [walletRoutePaths.activity]: BrowserViewSections.TRANSACTION,
    [walletRoutePaths.earn]: BrowserViewSections.STAKING,
    [walletRoutePaths.addressBook]: BrowserViewSections.ADDRESS_BOOK,
    [walletRoutePaths.signMessage]: BrowserViewSections.SIGN_MESSAGE,
    [walletRoutePaths.settings]: BrowserViewSections.SETTINGS
  };

  const LaceLogo = theme.name === 'dark' ? LaceLogoMarkDark : LaceLogoMark;

  return (
    <div className={styles.header} data-testid="header-container">
      <div
        className={classNames(styles.content, {
          [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true'
        })}
      >
        {process.env.USE_MULTI_WALLET === 'true' && (
          <div className={styles.multiWalletNetworkPillBox}>
            <NetworkPill isPopup />
          </div>
        )}
        <Link
          className={styles.linkLogo}
          to={walletRoutePaths.assets}
          data-testid="header-logo"
          onClick={() => analytics.sendEventToPostHog(PostHogAction.WalletLaceClick)}
        >
          <LaceLogo className={styles.logo} />
          {process.env.USE_MULTI_WALLET !== 'true' && <NetworkPill />}
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
