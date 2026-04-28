import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { IdentityCenterPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="identity-center-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.IdentityCenter}
      component={IdentityCenterPage}
      options={{
        tabBarIcon: () => <Icon name="Cardano" />,
        tabBarAccessibilityLabel: 'Identity',
        animation: 'fade',
      }}
    />
  </React.Fragment>
);

export default tabPages;
