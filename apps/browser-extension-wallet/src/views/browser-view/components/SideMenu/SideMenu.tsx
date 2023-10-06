import React, { useEffect, useState } from 'react';
import { MenuProps } from 'antd';
import { useHistory } from 'react-router-dom';
import { MenuItemList } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { sideMenuConfig } from './side-menu-config';
import { SideMenuContent } from './SideMenuContent';
import { walletRoutePaths as routes } from '@routes/wallet-paths';

const isPathAvailable = (path: string) => Object.values(routes).includes(path);

export const SideMenu = (): React.ReactElement => {
  const {
    push,
    location: { pathname },
    listen
  } = useHistory();
  const analytics = useAnalyticsContext();

  const [currentHoveredItem, setCurrentHoveredItem] = useState<MenuItemList | undefined>();

  const [tab, setTab] = useState(isPathAvailable(pathname) ? pathname : routes.assets);

  useEffect(() => {
    const unregisterListener = listen((location) => {
      setTab(isPathAvailable(location.pathname) ? location.pathname : routes.assets);
    });

    return () => unregisterListener();
  }, [listen]);

  const sendAnalytics = (category: MatomoEventCategories, name: string, postHogAction?: PostHogAction) => {
    analytics.sendEventToMatomo({
      category,
      action: MatomoEventActions.CLICK_EVENT,
      name
    });

    if (postHogAction) {
      analytics.sendEventToPostHog(postHogAction);
    }
  };

  const handleRedirection: MenuProps['onClick'] = (field) => {
    switch (field.key) {
      case routes.assets:
        sendAnalytics(
          MatomoEventCategories.VIEW_TOKENS,
          AnalyticsEventNames.ViewTokens.VIEW_TOKEN_LIST_BROWSER,
          PostHogAction.TokenTokensClick
        );
        break;
      case routes.staking:
        sendAnalytics(
          MatomoEventCategories.STAKING,
          AnalyticsEventNames.Staking.VIEW_STAKING_BROWSER,
          PostHogAction.StakingClick
        );
        break;
      case routes.activity:
        sendAnalytics(
          MatomoEventCategories.VIEW_TRANSACTIONS,
          AnalyticsEventNames.ViewTransactions.VIEW_TX_LIST_BROWSER,
          PostHogAction.ActivityActivityClick
        );
        break;
      case routes.nfts:
        sendAnalytics(
          MatomoEventCategories.VIEW_NFT,
          AnalyticsEventNames.ViewNFTs.VIEW_NFT_LIST_BROWSER,
          PostHogAction.NFTsClick
        );
    }
    push(field.key);
  };

  const onMouseEnterItem = (item: MenuItemList) => {
    setCurrentHoveredItem(item);
  };

  // eslint-disable-next-line unicorn/no-useless-undefined
  const onMouseLeaveItem = () => setCurrentHoveredItem(undefined);

  return (
    <SideMenuContent
      menuItems={sideMenuConfig}
      activeItemId={tab}
      hoveredItemId={currentHoveredItem}
      onClick={handleRedirection}
      onMouseEnter={onMouseEnterItem}
      onMouseLeave={onMouseLeaveItem}
    />
  );
};
