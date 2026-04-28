import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  AccountKey,
  AddAccount,
  AddWalletHardware,
  AddWalletHardwareSetup,
  CustomizeAccount,
  CustomizeAccountSuccess,
  RemoveAccountSuccess,
  RemoveWalletSuccess,
  CreateNewWallet,
  SuccessCreateNewWalletSheet,
  EditWalletSuccess,
  AddedAccountSuccess,
  AddedAccountFailed,
  RestoreWalletRecoveryPhraseSheet,
  RestoreWalletSelectBlockchainsSheet,
  RestoreWalletSuccessSheet,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="account-management-sheet-pages-addons">
      <SheetStack.Screen name={SheetRoutes.AccountKey} component={AccountKey} />
      <SheetStack.Screen name={SheetRoutes.AddAccount} component={AddAccount} />
      <SheetStack.Screen
        name={SheetRoutes.CreateNewWallet}
        component={CreateNewWallet}
      />
      <SheetStack.Screen
        name={SheetRoutes.AddWalletHardware}
        component={AddWalletHardware}
      />
      <SheetStack.Screen
        name={SheetRoutes.AddWalletHardwareSetup}
        component={AddWalletHardwareSetup}
      />
      <SheetStack.Screen
        name={SheetRoutes.RestoreWalletRecoveryPhrase}
        component={RestoreWalletRecoveryPhraseSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.RestoreWalletSelectBlockchains}
        component={RestoreWalletSelectBlockchainsSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.RestoreWalletSuccess}
        component={RestoreWalletSuccessSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.RemoveAccountSuccess}
        component={RemoveAccountSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.RemoveWalletSuccess}
        component={RemoveWalletSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.SuccessCreateNewWallet}
        component={SuccessCreateNewWalletSheet}
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
      <SheetStack.Screen
        name={SheetRoutes.AddedAccountSuccess}
        component={AddedAccountSuccess}
      />
      <SheetStack.Screen
        name={SheetRoutes.AddedAccountFailed}
        component={AddedAccountFailed}
      />
    </React.Fragment>
  );
};

export default sheetPages;
