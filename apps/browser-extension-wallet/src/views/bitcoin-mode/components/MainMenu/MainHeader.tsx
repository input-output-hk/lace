import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MainHeader.module.scss';
import LaceLogoMark from '../../../../assets/branding/lace-logo-mark.component.svg';
import { walletRoutePaths } from '../../wallet-paths';
import classNames from 'classnames';

import { DropdownMenu } from '@components/DropdownMenu';
import { NetworkPill } from '@components/NetworkPill';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const MainHeader = (): React.ReactElement => {
  const analytics = useAnalyticsContext();

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
          <LaceLogoMark className={styles.logo} />
          {process.env.USE_MULTI_WALLET !== 'true' && <NetworkPill />}
        </Link>
        <div className={styles.controls}>
          <DropdownMenu isPopup />
        </div>
      </div>
    </div>
  );
};
