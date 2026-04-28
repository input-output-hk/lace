import { createMigrate } from 'redux-persist';

import { addUkFcaDisclaimerAcknowledged } from './migrations';
import { dappCenterReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const dappExplorerStore: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: dappCenterReducers,
  persistConfig: {
    dappExplorer: {
      version: 2,
      whitelist: [
        'selectedDapp',
        'categories',
        'dappList',
        'ukFcaDisclaimerAcknowledged',
      ],
      migrate: createMigrate({
        2: addUkFcaDisclaimerAcknowledged,
      }),
    },
  },
});

export default dappExplorerStore;
