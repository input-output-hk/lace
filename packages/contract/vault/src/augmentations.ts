import type { vaultReducers } from './store/slice';
import type { VaultCapabilities } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface LaceAddons {
    readonly loadVaultCapabilities: DynamicallyLoadedInit<VaultCapabilities>;
  }

  interface State extends StateFromReducersMapObject<typeof vaultReducers> {}
}
