import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ContactsPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="address-book-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.Contacts}
      component={ContactsPage}
      options={{
        tabBarIcon: () => <Icon name="Contacts" />,
        tabBarAccessibilityLabel: 'Contacts',
        animation: 'fade',
        tabBarLabel: 'v2.menu.contacts',
      }}
    />
  </React.Fragment>
);

export default tabPages;
