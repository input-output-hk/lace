import { SheetStack, SheetRoutes } from '@lace-lib/navigation';
import React from 'react';

import {
  AddAssets,
  AddressBook,
  QrScanner,
  ReviewTransaction,
  SendResult,
  SendSheet,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="send-flow-sheet-pages-addons">
      <SheetStack.Screen name={SheetRoutes.Send} component={SendSheet} />
      <SheetStack.Screen name={SheetRoutes.SendResult} component={SendResult} />
      <SheetStack.Screen
        name={SheetRoutes.AddressBook}
        component={AddressBook}
      />
      <SheetStack.Screen name={SheetRoutes.QrScanner} component={QrScanner} />
      <SheetStack.Screen
        name={SheetRoutes.ReviewTransaction}
        component={ReviewTransaction}
      />
      <SheetStack.Screen name={SheetRoutes.AddAssets} component={AddAssets} />
    </React.Fragment>
  );
};

export default sheetPages;
