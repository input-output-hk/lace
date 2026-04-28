import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { SwapsCenterPage } from '../pages/SwapCenter';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="swap-center-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.Swaps}
      component={SwapsCenterPage}
      options={{
        tabBarIcon: () => <Icon name="Swap" />,
        tabBarLabel: 'v2.menu.swap',
        tabBarAccessibilityLabel: 'Swaps',
        animation: 'fade',
      }}
    />
  </React.Fragment>
);

export default tabPages;
