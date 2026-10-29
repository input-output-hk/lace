import { createMigrate } from 'redux-persist';

import { walletsMigrations } from './persisted-migrations';
import { repositorySlice } from './repo-slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export const walletsReducers = {
  wallets: repositorySlice.reducer,
};

/** The slice of app state owned by the wallet repository, under the `wallets` key. */
export type WalletsState = StateFromReducersMapObject<typeof walletsReducers>;

const storeExports: LaceInit<LaceModuleStoreInit> = async () => {
  return {
    reducers: walletsReducers,
    persistConfig: {
      wallets: {
        version: 5,
        migrate: createMigrate(walletsMigrations),
      },
    },
  };
};

export default storeExports;
