import {
  Tab,
  NavigationControls,
  SheetRoutes,
  type BottomTabBarProps,
  type StackRoutes,
  type StackScreenProps,
} from '@lace-lib/navigation';
import React, { useCallback } from 'react';

import { TabBar } from './TabBar';
import { useHomeProps } from './useHomeProps';

export const Home = ({
  children,
}: StackScreenProps<StackRoutes.Home> & { children: React.ReactNode }) => {
  const {
    tabBarPosition,
    networkName,
    buildTabRoutes,
    laceButtonBadge,
    isOffline,
  } = useHomeProps();

  const openNetworkSelectionSheet = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.NetworkSelection);
  }, []);

  const renderTabBar = useCallback(
    (bottomTabBarProps: BottomTabBarProps) => {
      const { mainRoutes, expandableRoutes } =
        buildTabRoutes(bottomTabBarProps);
      return (
        <TabBar
          openNetworkSelectionSheet={openNetworkSelectionSheet}
          mainRoutes={mainRoutes}
          expandableRoutes={expandableRoutes}
          networkName={networkName}
          laceButtonBadge={laceButtonBadge}
          isOffline={isOffline}
        />
      );
    },
    [
      buildTabRoutes,
      networkName,
      laceButtonBadge,
      openNetworkSelectionSheet,
      isOffline,
    ],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarPosition,
      }}
      tabBar={renderTabBar}>
      {children}
    </Tab.Navigator>
  );
};
