import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { walletRoutePaths } from '../../';

import AssetsIconDefault from '../../../../assets/icons/assets-icon.component.svg';
import AssetsIconActive from '../../../../assets/icons/active-assets-icon.component.svg';
import AssetIconHover from '../../../../assets/icons/hover-assets-icon.component.svg';

import TransactionsIconDefault from '../../../../assets/icons/transactions-icon.component.svg';
import TransactionsIconActive from '../../../../assets/icons/active-transactions-icon.component.svg';
import TransactionsIconHover from '../../../../assets/icons/hover-transactions-icon.component.svg';
import { MenuItemList } from '@src/utils/constants';
import styles from './MainFooter.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const includesCoin = /coin/i;

// eslint-disable-next-line complexity
export const MainFooter = (): React.ReactElement => {
  const location = useLocation<{ pathname: string }>();
  const history = useHistory();
  const analytics = useAnalyticsContext();

  const currentLocation = location?.pathname;
  const isWalletIconActive =
    currentLocation === walletRoutePaths.assets || includesCoin.test(currentLocation) || currentLocation === '/';

  const [currentHoveredItem, setCurrentHoveredItem] = useState<MenuItemList | undefined>();
  const onMouseEnterItem = (item: MenuItemList) => {
    setCurrentHoveredItem(item);
  };

  // eslint-disable-next-line unicorn/no-useless-undefined
  const onMouseLeaveItem = () => setCurrentHoveredItem(undefined);

  const AssetsIcon = currentHoveredItem === MenuItemList.ASSETS ? AssetIconHover : AssetsIconDefault;
  const TransactionsIcon =
    currentHoveredItem === MenuItemList.TRANSACTIONS ? TransactionsIconHover : TransactionsIconDefault;

  const sendAnalytics = (postHogAction?: PostHogAction) => {
    if (postHogAction) {
      analytics.sendEventToPostHog(postHogAction);
    }
  };

  const handleNavigation = (path: string) => {
    switch (path) {
      case walletRoutePaths.assets:
        sendAnalytics(PostHogAction.TokenTokensClick);
        break;
      case walletRoutePaths.activity:
        sendAnalytics(PostHogAction.ActivityActivityClick);
        break;
    }

    history.push(path);
  };

  return (
    <div className={styles.footer}>
      <div data-testid="main-menu-container" className={styles.content}>
        <button
          onMouseEnter={() => onMouseEnterItem(MenuItemList.ASSETS)}
          onMouseLeave={onMouseLeaveItem}
          data-testid="main-footer-assets"
          onClick={() => handleNavigation(walletRoutePaths.assets)}
        >
          {isWalletIconActive ? <AssetsIconActive className={styles.icon} /> : <AssetsIcon className={styles.icon} />}
        </button>
        <button
          onMouseEnter={() => onMouseEnterItem(MenuItemList.TRANSACTIONS)}
          onMouseLeave={onMouseLeaveItem}
          data-testid="main-footer-activity"
          onClick={() => handleNavigation(walletRoutePaths.activity)}
        >
          {currentLocation === walletRoutePaths.activity ? (
            <TransactionsIconActive className={styles.icon} />
          ) : (
            <TransactionsIcon className={styles.icon} />
          )}
        </button>
      </div>
    </div>
  );
};
