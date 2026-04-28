import { isReduxPersistState } from '@lace-contract/module';
import { createTransform } from 'redux-persist';

import { syncReducers } from './slice';

import type { SyncSliceState } from '../types';
import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';
import type { PersistedStateProperty } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Transform that excludes pendingSync from being persisted.
 * Only lastSuccessfulSync is persisted for each account.
 */
const ExcludePendingSyncTransform = createTransform<
  PersistedStateProperty<SyncSliceState>,
  PersistedStateProperty<SyncSliceState>
>(
  // transform state on its way to being serialized and persisted
  (inboundState, key) => {
    if (isReduxPersistState(key, inboundState)) {
      return inboundState;
    }

    const outboundState: SyncSliceState['syncStatusByAccount'] = {};

    if (key === 'syncStatusByAccount') {
      const syncStatusByAccount = inboundState;

      // Use for...in loop which safely handles undefined/null (doesn't iterate)
      for (const accountId in syncStatusByAccount) {
        const accountStatus = syncStatusByAccount[accountId as AccountId];
        outboundState[accountId as AccountId] = {
          lastSuccessfulSync: accountStatus.lastSuccessfulSync,
          // pendingSync is intentionally excluded (transient state)
        };
      }
    }

    return outboundState;
  },
);

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: syncReducers,
  persistConfig: {
    sync: {
      version: 1,
      whitelist: ['syncStatusByAccount'],
      transforms: [ExcludePendingSyncTransform],
    },
  },
});

export default store;
