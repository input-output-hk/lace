import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { NotificationDetailsPage } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const stackPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="notification-center-stack-pages-addons">
    <Stack.Screen
      name={StackRoutes.NotificationDetails}
      component={NotificationDetailsPage}
    />
  </React.Fragment>
);

export default stackPages;
