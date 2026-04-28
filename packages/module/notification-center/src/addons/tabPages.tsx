import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { NotificationCenterPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const tabPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="notification-center-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.NotificationCenter}
      component={NotificationCenterPage}
      options={{
        tabBarIcon: () => <Icon name="Notification" />,
        animation: 'fade',
        tabBarLabel: 'v2.menu.notifications',
      }}
    />
  </React.Fragment>
);

export default tabPages;
