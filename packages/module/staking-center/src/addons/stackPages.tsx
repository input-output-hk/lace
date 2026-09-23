import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { CardanoStakingDetail } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

// Cardano staking detail is a full-screen stack page (not a bottom sheet),
// opened from the Staking Center hub's Cardano staking card. It holds the
// network info / delegation / rewards that used to live on the hub root.
const stackPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="staking-center-stack-pages-addons">
    <Stack.Screen
      name={StackRoutes.CardanoStakingDetail}
      component={CardanoStakingDetail}
    />
  </React.Fragment>
);

export default stackPages;
