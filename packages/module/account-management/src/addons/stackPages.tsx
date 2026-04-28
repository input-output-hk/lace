import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { AccountDetails } from '../pages/accountDetails';
import { AddWalletPage } from '../pages/AddWallet/AddWalletPage';
import { WalletSettings } from '../pages/walletSettings';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const stackPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="account-management-stack-pages-addons">
    <Stack.Screen
      name={StackRoutes.AccountDetails}
      component={AccountDetails}
    />
    <Stack.Screen
      name={StackRoutes.WalletSettings}
      component={WalletSettings}
    />
    <Stack.Screen name={StackRoutes.AddWallet} component={AddWalletPage} />
  </React.Fragment>
);

export default stackPages;
