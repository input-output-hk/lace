import { useAnalytics } from '@lace-contract/analytics';
import {
  Tab,
  NavigationControls,
  SheetRoutes,
  type BottomTabBarProps,
  type StackRoutes,
  type StackScreenProps,
} from '@lace-lib/navigation';
import { isIOS } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { TabBar } from './TabBar';
import { useHomeProps } from './useHomeProps';

export const Home = ({
  children,
}: StackScreenProps<StackRoutes.Home> & { children: React.ReactNode }) => {
  const { tabBarPosition, networkName, buildTabRoutes, laceButtonBadge } =
    useHomeProps();
  const { trackEvent } = useAnalytics();

  const openNetworkSelectionSheet = useCallback(() => {
    trackEvent('home | tab bar | network | press');
    NavigationControls.sheets.navigate(SheetRoutes.NetworkSelection);
  }, [trackEvent]);

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
        />
      );
    },
    [buildTabRoutes, networkName, laceButtonBadge, openNetworkSelectionSheet],
  );

  return (
    <Tab.Navigator
      detachInactiveScreens={!isIOS}
      screenOptions={{
        headerShown: false,
        tabBarPosition,
      }}
      tabBar={renderTabBar}>
      {children}
    </Tab.Navigator>
  );
};
