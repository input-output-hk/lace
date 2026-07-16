import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { GovernanceCenterPage } from '../pages/GovernanceCenterPage';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="governance-center-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.GovernanceCenter}
      component={GovernanceCenterPage}
      options={{
        tabBarLabel: 'v2.menu.governance',
        tabBarIcon: () => <Icon name="Earth" />,
        tabBarAccessibilityLabel: 'Governance',
        animation: 'fade',
      }}
    />
  </React.Fragment>
);

export default tabPages;
