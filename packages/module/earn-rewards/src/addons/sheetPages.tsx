import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { EarnRewardsSheet } from '../pages/EarnRewardsSheet';

import type { AvailableAddons } from '../index';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="earn-rewards-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.EarnRewards}
      component={EarnRewardsSheet}
      options={{ detents: [1], scrollable: true }}
    />
  </React.Fragment>
);

export default sheetPages;
