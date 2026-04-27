import type { addressesReducers } from './store/slice';
import type { AddressAliasResolver } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof addressesReducers> {}

  interface LaceAddons {
    loadAddressAliasResolver: DynamicallyLoadedInit<AddressAliasResolver>;
  }
}
