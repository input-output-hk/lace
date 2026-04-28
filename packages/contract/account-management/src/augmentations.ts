import type { accountManagementReducers } from './store';
import type {
  AccountSettingsUICustomisation,
  AccountCenterWalletsUICustomisation,
  WalletSettingsUICustomisation,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof accountManagementReducers> {}
  interface LaceAddons {
    readonly loadAccountSettingsUICustomisations: DynamicallyLoadedInit<AccountSettingsUICustomisation>;
    readonly loadWalletSettingsUICustomisations: DynamicallyLoadedInit<WalletSettingsUICustomisation>;
    readonly loadAccountCenterWalletsUICustomisations: DynamicallyLoadedInit<AccountCenterWalletsUICustomisation>;
  }
}
