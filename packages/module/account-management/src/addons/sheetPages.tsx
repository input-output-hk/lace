import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  AccountKey,
  CustomizeAccount,
  CustomizeAccountSuccess,
  RemoveAccountSuccess,
  RemoveWalletSuccess,
  EditWalletSuccess,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="account-management-sheet-pages-addons">
      <SheetStack.Screen name={SheetRoutes.AccountKey} component={AccountKey} />
      <SheetStack.Screen
        name={SheetRoutes.RemoveAccountSuccess}
        component={RemoveAccountSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.RemoveWalletSuccess}
        component={RemoveWalletSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.CustomizeAccount}
        component={CustomizeAccount}
      />
      <SheetStack.Screen
        name={SheetRoutes.CustomizeAccountSuccess}
        component={CustomizeAccountSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.EditWalletSuccess}
        component={EditWalletSuccess}
      />
    </React.Fragment>
  );
};

export default sheetPages;
