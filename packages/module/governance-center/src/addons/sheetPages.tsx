import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { BrowseDRepSheet } from '../pages/browse-drep/BrowseDRepSheet';
import { DRepDelegationSuccessSheet } from '../pages/delegation-success/DRepDelegationSuccessSheet';
import { DRepDetailsSheet } from '../pages/drep-details/DRepDetailsSheet';
import { NewDRepDelegationSheet } from '../pages/new-drep-delegation/NewDRepDelegationSheet';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="governance-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.BrowseDRep}
      component={BrowseDRepSheet}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.DRepDetails}
      component={DRepDetailsSheet}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.NewDRepDelegation}
      component={NewDRepDelegationSheet}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.DRepDelegationSuccess}
      component={DRepDelegationSuccessSheet}
    />
  </React.Fragment>
);

export default sheetPages;
