import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { AuthorizeDapp, SignData, SignTx } from '../pages';

import type { AvailableAddons } from '../..';
import type { ContextualLaceInit } from '@lace-contract/module';

/**
 * Sheet page addon providing navigation routes for dApp connector screens.
 *
 * @returns React fragment containing SheetStack.Screen components for each route
 */
const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="dapp-connector-cardano-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.AuthorizeDapp}
        component={AuthorizeDapp}
      />
      <SheetStack.Screen name={SheetRoutes.SignData} component={SignData} />
      <SheetStack.Screen name={SheetRoutes.SignTx} component={SignTx} />
    </React.Fragment>
  );
};

export default sheetPages;
