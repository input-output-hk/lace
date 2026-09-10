import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { AddAccount } from '../pages/AddAccount/AddAccount';
import { AddedAccountFailed } from '../pages/AddedAccountFailed/AddedAccountFailed';
import { AddedAccountSuccess } from '../pages/AddedAccountSuccess/AddedAccountSuccess';
import { AddWalletHardware } from '../pages/AddWalletHardware/AddWalletHardware';
import { AddWalletHardwareSetup } from '../pages/AddWalletHardwareSetup/AddWalletHardwareSetup';
import { CreateNewWallet } from '../pages/CreateNewWallet/CreateNewWallet';
import { RestoreWalletRecoveryPhraseSheet } from '../pages/RestoreWallet/RestoreWalletRecoveryPhraseSheet';
import { RestoreWalletSelectBlockchainsSheet } from '../pages/RestoreWallet/RestoreWalletSelectBlockchainsSheet';
import { RestoreWalletSuccessSheet } from '../pages/RestoreWallet/RestoreWalletSuccessSheet';
import { SuccessCreateNewWalletSheet } from '../pages/SuccessCreateNewWalletSheet/SuccessCreateNewWalletSheet';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="vault-local-sheet-pages-addons">
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
        name={SheetRoutes.SuccessCreateNewWallet}
        component={SuccessCreateNewWalletSheet}
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
