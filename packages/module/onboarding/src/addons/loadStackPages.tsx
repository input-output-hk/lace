import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { OnboardingCreateWallet } from '../pages/OnboardingCreateWallet';
import { OnboardingDesktopLogin } from '../pages/OnboardingDesktopLogin';
import { OnboardingHardwareSetup } from '../pages/OnboardingHardwareSetup';
import { OnboardingHardwareWallet } from '../pages/OnboardingHardwareWallet';
import { OnboardingRestoreWallet } from '../pages/OnboardingRestoreWallet';
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
    <Stack.Screen
      name={StackRoutes.OnboardingDesktopLogin}
      component={OnboardingDesktopLogin}
    />
    <Stack.Screen
      name={StackRoutes.OnboardingRestoreWallet}
      component={OnboardingRestoreWallet}
    />
    <Stack.Screen
      name={StackRoutes.OnboardingCreateWallet}
      component={OnboardingCreateWallet}
    />
    <Stack.Screen
      name={StackRoutes.OnboardingHardware}
      component={OnboardingHardwareWallet}
    />
    <Stack.Screen
      name={StackRoutes.OnboardingHardwareSetup}
      component={OnboardingHardwareSetup}
    />
  </React.Fragment>
);

export default loadStackPages;
