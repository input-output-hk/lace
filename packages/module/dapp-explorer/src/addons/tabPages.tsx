import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { DappExplorer } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="dapp-explorer-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.DApps}
      component={DappExplorer}
      options={{
        tabBarLabel: 'v2.menu.dapp',
        tabBarIcon: () => <Icon name="DashboardSquareSetting" />,
      }}
    />
  </React.Fragment>
);

export default tabPages;
