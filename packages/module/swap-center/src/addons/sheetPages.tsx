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

const swapSheetOptions = { detents: [1], scrollable: true };

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="swap-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.SwapSelectSellToken}
      component={SwapSelectSellToken}
      options={swapSheetOptions}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapSelectBuyToken}
      component={SwapSelectBuyToken}
      options={swapSheetOptions}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapSlippage}
      component={SwapSlippage}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapLiquiditySources}
      component={SwapLiquiditySources}
      options={swapSheetOptions}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapReview}
      component={SwapReview}
      options={swapSheetOptions}
    />
    <SheetStack.Screen
      name={SheetRoutes.SwapResult}
      component={SwapResult}
      options={swapSheetOptions}
    />
  </React.Fragment>
);

export default sheetPages;
