import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { DefaultOpenModeSheet } from '../pages/DefaultOpenMode';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="views-extension-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.DefaultOpenMode}
      component={DefaultOpenModeSheet}
    />
  </React.Fragment>
);

export default sheetPages;
