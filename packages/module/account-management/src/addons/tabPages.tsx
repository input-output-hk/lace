import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { AccountCenter } from '../pages/accountCenter';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="account-management-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.AccountCenter}
      component={AccountCenter}
      options={{
        tabBarIcon: () => <Icon name="CarouselHorizontal" />,
        tabBarAccessibilityLabel: 'AccountCenter',
        animation: 'fade',
        tabBarLabel: 'v2.menu.accounts',
      }}
    />
  </React.Fragment>
);

export default tabPages;
