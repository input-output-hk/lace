import {
  TabBar as TabBarToolkit,
  type LaceButtonBadgeProps,
  type Network,
  type TabButtonProps,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { useTabBarAccountData } from './useTabBarAccountData';

type TabBarProps = {
  mainRoutes: TabButtonProps[];
  expandableRoutes: TabButtonProps[];
  networkName: Network;
  laceButtonBadge?: LaceButtonBadgeProps;
  openNetworkSelectionSheet: () => void;
  isOffline?: boolean;
};

export const TabBar = ({
  mainRoutes,
  expandableRoutes,
  networkName,
  laceButtonBadge,
  openNetworkSelectionSheet,
  isOffline,
}: TabBarProps) => {
  const accountData = useTabBarAccountData();

  return (
    <TabBarToolkit
      mainRoutes={mainRoutes}
      expandableRoutes={expandableRoutes}
      accountData={accountData}
      networkName={networkName}
      laceButtonBadge={laceButtonBadge}
      openNetworkSelectionSheet={openNetworkSelectionSheet}
      isOffline={isOffline}
    />
  );
};
