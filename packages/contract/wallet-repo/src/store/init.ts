import { createMigrate } from 'redux-persist';

import {
  setBlockchainNetworkId,
  updateMidnightAccountIds,
} from '../migrations';

import { repositorySlice } from './repo-slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export const walletsReducers = {
  wallets: repositorySlice.reducer,
};

export type WalletsState = StateFromReducersMapObject<typeof walletsReducers>;

const storeExports: LaceInit<LaceModuleStoreInit> = async () => {
  return {
    reducers: walletsReducers,
    persistConfig: {
      wallets: {
        version: 4,
        migrate: createMigrate({
          3: setBlockchainNetworkId,
          4: updateMidnightAccountIds,
        }),
      },
    },
  };
};

export default storeExports;
