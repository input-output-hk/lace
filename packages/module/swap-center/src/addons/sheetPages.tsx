import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { SwapLiquiditySources } from '../pages/SwapLiquiditySources';
import { SwapResult } from '../pages/SwapResult';
import { SwapReview } from '../pages/SwapReview';
import {
  SwapSelectBuyToken,
  SwapSelectSellToken,
} from '../pages/SwapSelectToken';
import { SwapSlippage } from '../pages/SwapSlippage';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="swap-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.SwapSelectSellToken}
      component={SwapSelectSellToken}
      options={{ snapPoints: ['80%'] }}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapSelectBuyToken}
      component={SwapSelectBuyToken}
      options={{ snapPoints: ['80%'] }}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapSlippage}
      component={SwapSlippage}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapLiquiditySources}
      component={SwapLiquiditySources}
      options={{ snapPoints: ['80%'] }}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapReview}
      component={SwapReview}
      options={{ snapPoints: ['80%'] }}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapResult}
      component={SwapResult}
      options={{ snapPoints: ['80%'] }}
    />
  </React.Fragment>
);

export default sheetPages;
