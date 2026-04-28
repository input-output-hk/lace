import type { addressBookReducers } from './store/slice';
import type { AddressBookAddressValidator } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof addressBookReducers> {}

  interface LaceAddons {
    readonly loadAddressBookAddressValidators: DynamicallyLoadedInit<AddressBookAddressValidator>;
  }
}
