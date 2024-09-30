import React, { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { walletRoutePaths } from '../../routes';

import NftIconDefault from '../../assets/icons/nft-icon.component.svg';
import NftIconActive from '../../assets/icons/active-nft-icon.component.svg';
import NftIconActiveHover from '../../assets/icons/hover-nft-icon.component.svg';

import AssetsIconDefault from '../../assets/icons/assets-icon.component.svg';
import AssetsIconActive from '../../assets/icons/active-assets-icon.component.svg';
import AssetIconHover from '../../assets/icons/hover-assets-icon.component.svg';

import StakingIconActive from '../../assets/icons/active-database-icon.component.svg';
import StakingIconDefault from '../../assets/icons/database-icon.component.svg';
import StakingIconHover from '../../assets/icons/hover-database-icon.component.svg';

import TransactionsIconDefault from '../../assets/icons/transactions-icon.component.svg';
import TransactionsIconActive from '../../assets/icons/active-transactions-icon.component.svg';
import TransactionsIconHover from '../../assets/icons/hover-transactions-icon.component.svg';
import { MenuItemList } from '@src/utils/constants';
import styles from './MainFooter.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useWalletStore } from '@stores';

const includesCoin = /coin/i;

// eslint-disable-next-line complexity
export const MainFooter = (): React.ReactElement => {
  const location = useLocation<{ pathname: string }>();
  const history = useHistory();
  const analytics = useAnalyticsContext();
  const { isSharedWallet } = useWalletStore();

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
  const NftIcon = currentHoveredItem === MenuItemList.NFT ? NftIconActiveHover : NftIconDefault;
  const TransactionsIcon =
    currentHoveredItem === MenuItemList.TRANSACTIONS ? TransactionsIconHover : TransactionsIconDefault;
  const StakingIcon = currentHoveredItem === MenuItemList.STAKING ? StakingIconHover : StakingIconDefault;

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
      case walletRoutePaths.earn:
        sendAnalytics(PostHogAction.StakingClick);
        break;
      case walletRoutePaths.activity:
        sendAnalytics(PostHogAction.ActivityActivityClick);
        break;
      case walletRoutePaths.nfts:
        sendAnalytics(PostHogAction.NFTsClick);
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
          onMouseEnter={() => onMouseEnterItem(MenuItemList.NFT)}
          onMouseLeave={onMouseLeaveItem}
          data-testid="main-footer-nfts"
          onClick={() => handleNavigation(walletRoutePaths.nfts)}
        >
          {currentLocation === walletRoutePaths.nfts ? (
            <NftIconActive className={styles.icon} />
          ) : (
            <NftIcon className={styles.icon} />
          )}
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
        {!isSharedWallet && (
          <button
            onMouseEnter={() => onMouseEnterItem(MenuItemList.STAKING)}
            onMouseLeave={onMouseLeaveItem}
            data-testid="main-footer-staking"
            onClick={() => handleNavigation(walletRoutePaths.earn)}
          >
            {currentLocation === walletRoutePaths.earn ? (
              <StakingIconActive className={styles.icon} />
            ) : (
              <StakingIcon className={styles.icon} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
