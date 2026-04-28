import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import {
  IntroStartPage,
  IntroLacePage,
  IntroProofPage,
  IntroPrivacyPage,
  IntroCompletePage,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const stackPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="identity-center-stack-pages-addons">
    <Stack.Screen name={StackRoutes.IntroStart} component={IntroStartPage} />
    <Stack.Screen name={StackRoutes.IntroLace} component={IntroLacePage} />
    <Stack.Screen name={StackRoutes.IntroProof} component={IntroProofPage} />
    <Stack.Screen
      name={StackRoutes.IntroPrivacy}
      component={IntroPrivacyPage}
    />
    <Stack.Screen
      name={StackRoutes.IntroComplete}
      component={IntroCompletePage}
    />
  </React.Fragment>
);

export default stackPages;
