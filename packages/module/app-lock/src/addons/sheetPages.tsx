import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { LockSettings } from '../pages/LockSettings';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="app-lock-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.LockSettings}
      component={LockSettings}
    />
  </React.Fragment>
);

export default sheetPages;
