import type { secureStoreReducers } from './store';
import type { SecureStore, SecureStoreSideEffectDependencies } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof secureStoreReducers> {}

  interface SideEffectDependencies extends SecureStoreSideEffectDependencies {}

  interface LaceAddons {
    readonly loadSecureStore: DynamicallyLoadedInit<SecureStore>;
  }
}
