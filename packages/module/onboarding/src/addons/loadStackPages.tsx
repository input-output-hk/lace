import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { OnboardingStart } from '../pages/OnboardingStart';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const loadStackPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="onboarding-stack-pages-addons">
    <Stack.Screen
      name={StackRoutes.OnboardingStart}
      component={OnboardingStart}
    />
  </React.Fragment>
);

export default loadStackPages;
