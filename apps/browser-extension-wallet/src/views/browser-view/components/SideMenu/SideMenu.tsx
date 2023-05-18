import React, { useEffect, useState } from 'react';
import { MenuProps } from 'antd';
import { useHistory } from 'react-router-dom';
import { MenuItemList } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { sideMenuConfig } from './side-menu-config';
import { SideMenuContent } from './SideMenuContent';
import { walletRoutePaths as routes } from '@routes/wallet-paths';

const isPathAvailable = (path: string) => Object.values(routes).includes(path);

export const SideMenu = ({ isFullWidthMenu = true }: { isFullWidthMenu?: boolean }): React.ReactElement => {
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

  const sendAnalytics = (category: AnalyticsEventCategories, name: string) => {
    analytics.sendEvent({
      category,
      action: AnalyticsEventActions.CLICK_EVENT,
      name
    });
  };

  const handleRedirection: MenuProps['onClick'] = (field) => {
    switch (field.key) {
      case routes.assets:
        sendAnalytics(AnalyticsEventCategories.VIEW_TOKENS, AnalyticsEventNames.ViewTokens.VIEW_TOKEN_LIST_BROWSER);
        break;
      case routes.staking:
        sendAnalytics(AnalyticsEventCategories.STAKING, AnalyticsEventNames.Staking.VIEW_STAKING_BROWSER);
        break;
      case routes.activity:
        sendAnalytics(
          AnalyticsEventCategories.VIEW_TRANSACTIONS,
          AnalyticsEventNames.ViewTransactions.VIEW_TX_LIST_BROWSER
        );
        break;
      case routes.nfts:
        sendAnalytics(AnalyticsEventCategories.VIEW_NFT, AnalyticsEventNames.ViewNFTs.VIEW_NFT_LIST_BROWSER);
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
      withLabel={isFullWidthMenu}
    />
  );
};
