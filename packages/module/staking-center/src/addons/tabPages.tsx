import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { StakingCenterPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="staking-center-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.StakingCenter}
      component={StakingCenterPage}
      options={{
        tabBarIcon: () => <Icon name="ChartIncrease" />,
        tabBarAccessibilityLabel: 'Staking',
        animation: 'fade',
      }}
    />
  </React.Fragment>
);

export default tabPages;
