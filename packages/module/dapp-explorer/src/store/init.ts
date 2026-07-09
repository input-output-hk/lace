import { createMigrate } from 'redux-persist';

import { initializeDependencies } from './dependencies';
import {
  addUkFcaDisclaimerAcknowledged,
  addLastFetchedAt,
  clearDappListOnSchemaChange,
} from './migrations';
import { loadDapps } from './side-effects';
import { dappCenterReducers } from './slice';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const dappExplorerStore: LaceInitSync<LaceModuleStoreInit> = (
  props,
  dependencies,
) => ({
  reducers: dappCenterReducers,
  persistConfig: {
    dappExplorer: {
      version: 4,
      whitelist: [
        'selectedDapp',
        'categories',
        'dappList',
        'ukFcaDisclaimerAcknowledged',
        'lastFetchedAt',
      ],
      migrate: createMigrate({
        2: addUkFcaDisclaimerAcknowledged,
        3: clearDappListOnSchemaChange,
        4: addLastFetchedAt,
      }),
    },
  },
  sideEffects: [loadDapps],
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default dappExplorerStore;
