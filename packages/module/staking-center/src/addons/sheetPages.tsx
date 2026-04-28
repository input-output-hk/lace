import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  BrowsePoolSheet,
  BrowsePoolFiltersSheet,
  DelegationSuccessSheet,
  DeregisterPoolSheetScreen,
  DeregistrationSuccessSheet,
  NewDelegationSheet,
  StakeDelegationSheet,
  StakePoolDetailsSheet,
  StakingIssueSheet,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="staking-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.BrowsePool}
      component={BrowsePoolSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.BrowsePoolFilterControls}
      component={BrowsePoolFiltersSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.StakePoolDetails}
      component={StakePoolDetailsSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.StakeDelegation}
      component={StakeDelegationSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.StakingIssue}
      component={StakingIssueSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.NewDelegation}
      component={NewDelegationSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.DelegationSuccess}
      component={DelegationSuccessSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.DeregisterPool}
      component={DeregisterPoolSheetScreen}
    />
    <SheetStack.Screen
      name={SheetRoutes.DeregistrationSuccess}
      component={DeregistrationSuccessSheet}
    />
  </React.Fragment>
);

export default sheetPages;
