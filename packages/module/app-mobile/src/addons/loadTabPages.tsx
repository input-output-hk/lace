import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { Portfolio, SettingsPage, SupportPage, AboutPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadTabPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="app-mobile-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.Portfolio}
      component={Portfolio}
      options={{
        tabBarIcon: () => <Icon name="Wallet" />,
        animation: 'fade',
        tabBarLabel: 'v2.menu.portfolio',
      }}
    />
    <Tab.Screen
      name={TabRoutes.Settings}
      component={SettingsPage}
      options={{
        tabBarIcon: () => <Icon name="Settings" />,
        animation: 'fade',
        tabBarLabel: 'v2.menu.settings',
      }}
    />
    <Tab.Screen
      name={TabRoutes.Support}
      component={SupportPage}
      options={{
        tabBarIcon: () => <Icon name="Conversation" />,
        animation: 'fade',
        tabBarLabel: 'v2.menu.support',
      }}
    />
    <Tab.Screen
      name={TabRoutes.About}
      component={AboutPage}
      options={{
        tabBarIcon: () => <Icon name="Info" />,
        animation: 'fade',
        tabBarLabel: 'v2.menu.about',
      }}
    />
  </React.Fragment>
);

export default loadTabPages;
