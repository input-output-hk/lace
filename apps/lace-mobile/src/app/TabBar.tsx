import { useAnalytics } from '@lace-contract/analytics';
import {
  TabBar as TabBarToolkit,
  type LaceButtonBadgeProps,
  type Network,
  type TabButtonProps,
} from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { useTabBarAccountData } from './useTabBarAccountData';

type TabBarProps = {
  mainRoutes: TabButtonProps[];
  expandableRoutes: TabButtonProps[];
  networkName: Network;
  laceButtonBadge?: LaceButtonBadgeProps;
  openNetworkSelectionSheet: () => void;
};

export const TabBar = ({
  mainRoutes,
  expandableRoutes,
  networkName,
  laceButtonBadge,
  openNetworkSelectionSheet,
}: TabBarProps) => {
  const accountData = useTabBarAccountData();
  const { trackEvent } = useAnalytics();

  const onLaceButtonPress = useCallback(() => {
    trackEvent('wallet | lace | press');
  }, [trackEvent]);

  const onAccountsStatusPress = useCallback(() => {
    trackEvent('home | tab bar | sync status | press');
  }, [trackEvent]);

  return (
    <TabBarToolkit
      mainRoutes={mainRoutes}
      expandableRoutes={expandableRoutes}
      accountData={accountData}
      networkName={networkName}
      laceButtonBadge={laceButtonBadge}
      openNetworkSelectionSheet={openNetworkSelectionSheet}
      onLaceButtonPress={onLaceButtonPress}
      onAccountsStatusPress={onAccountsStatusPress}
    />
  );
};
