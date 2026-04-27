import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { DappDetailSheet, DappExplorerFilters } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const bottomSheets: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => {
  return (
    <React.Fragment key="dapp-explorer-sheet-pages-addon">
      <SheetStack.Screen
        name={SheetRoutes.DappDetail}
        component={DappDetailSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.DappFilterControls}
        component={DappExplorerFilters}
      />
    </React.Fragment>
  );
};

export default bottomSheets;
