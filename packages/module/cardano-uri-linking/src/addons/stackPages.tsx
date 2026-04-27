import { StackRoutes, Stack } from '@lace-lib/navigation';
import React from 'react';

import { ClaimError, ClaimPayload, ClaimSuccess } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const stackPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="claim-center-sheet-pages-addons">
    <Stack.Screen name={StackRoutes.ClaimPayload} component={ClaimPayload} />
    <Stack.Screen name={StackRoutes.ClaimSuccess} component={ClaimSuccess} />
    <Stack.Screen name={StackRoutes.ClaimError} component={ClaimError} />
  </React.Fragment>
);

export default stackPages;
