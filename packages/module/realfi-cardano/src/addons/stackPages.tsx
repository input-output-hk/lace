import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { UsdrStakingDetail } from '../pages/UsdrStakingDetail';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

// USDr Staking detail is a full-screen stack page (not a bottom sheet) — opened
// from the Staking Center product card / onboarding.
const stackPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="realfi-stack-pages-addons">
    <Stack.Screen
      name={StackRoutes.UsdrStakingDetail}
      component={UsdrStakingDetail}
    />
  </React.Fragment>
);

export default stackPages;
