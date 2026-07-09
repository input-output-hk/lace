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
      <SheetStack.Screen
        name={SheetRoutes.Send}
        component={SendSheet}
        options={{ detents: [1], scrollable: true }}
      />
      <SheetStack.Screen
        name={SheetRoutes.SendResult}
        component={SendResult}
        options={{ detents: [1], scrollable: true }}
      />
      <SheetStack.Screen
        name={SheetRoutes.AddressBook}
        component={AddressBook}
        options={{ detents: [1], scrollable: true }}
      />
      <SheetStack.Screen
        name={SheetRoutes.QrScanner}
        component={QrScanner}
        options={{ detents: ['auto'] }}
      />
      <SheetStack.Screen
        name={SheetRoutes.ReviewTransaction}
        component={ReviewTransaction}
        options={{ detents: [1], scrollable: true }}
      />
      <SheetStack.Screen
        name={SheetRoutes.AddAssets}
        component={AddAssets}
        options={{ detents: [1], scrollable: true }}
      />
    </React.Fragment>
  );
};

export default sheetPages;
