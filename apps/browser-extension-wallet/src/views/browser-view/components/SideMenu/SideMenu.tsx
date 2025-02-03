import React, { useEffect, useState } from 'react';
import { MenuProps } from 'antd';
import { useHistory } from 'react-router-dom';
import { MenuItemList } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { sideMenuConfig } from './side-menu-config';
import { SideMenuContent } from './SideMenuContent';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { useWalletStore } from '@stores';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ExperimentName } from '@lib/scripts/types/feature-flags';

const isPathAvailable = (path: string) => Object.values(routes).includes(path);

export const SideMenu = (): React.ReactElement => {
  const {
    push,
    location: { pathname },
    listen
  } = useHistory();
  const analytics = useAnalyticsContext();
  const posthog = usePostHogClientContext();
  const isDappExplorerEnabled = posthog.isFeatureFlagEnabled(ExperimentName.DAPP_EXPLORER);

  const { isSharedWallet } = useWalletStore();

  const [currentHoveredItem, setCurrentHoveredItem] = useState<MenuItemList | undefined>();

  const [tab, setTab] = useState(isPathAvailable(pathname) ? pathname : routes.assets);

  useEffect(() => {
    const unregisterListener = listen((location) => {
      setTab(isPathAvailable(location.pathname) ? location.pathname : routes.assets);
    });

    return () => unregisterListener();
  }, [listen]);

  const sendAnalytics = (postHogAction?: PostHogAction): void => {
    if (postHogAction) {
      void analytics.sendEventToPostHog(postHogAction);
    }
  };

  const handleRedirection: MenuProps['onClick'] = (field) => {
    switch (field.key) {
      case routes.assets:
        sendAnalytics(PostHogAction.TokenTokensClick);
        break;
      case routes.staking:
        sendAnalytics(PostHogAction.StakingClick);
        break;
      case routes.activity:
        sendAnalytics(PostHogAction.ActivityActivityClick);
        break;
      case routes.nfts:
        sendAnalytics(PostHogAction.NFTsClick);
    }
    push(field.key);
  };

  const onMouseEnterItem = (item: MenuItemList) => {
    setCurrentHoveredItem(item);
  };

  // eslint-disable-next-line unicorn/no-useless-undefined
  const onMouseLeaveItem = () => setCurrentHoveredItem(undefined);

  const excludeItems: MenuItemList[] = [];
  if (isSharedWallet) {
    excludeItems.push(MenuItemList.STAKING);
  }
  if (!isDappExplorerEnabled) {
    excludeItems.push(MenuItemList.DAPPS);
  }
  const menuItems = sideMenuConfig.filter((item) => !excludeItems.includes(item.id));
  return (
    <SideMenuContent
      menuItems={menuItems}
      activeItemId={tab}
      hoveredItemId={currentHoveredItem}
      onClick={handleRedirection}
      onMouseEnter={onMouseEnterItem}
      onMouseLeave={onMouseLeaveItem}
    />
  );
};
