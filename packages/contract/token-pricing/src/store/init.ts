import { createMigrate } from 'redux-persist';

import { initializeSideEffects } from './side-effects';
import { tokenPricingReducers, type TokenPricingState } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';
import type { MigrationManifest, PersistedState } from 'redux-persist';

// v3 → v4: remove fxRatesToUsd and fxRatesLastUpdated (FX rates are now
// embedded as priceInUsd on each TokenPrice entry; no separate fetch needed).
const migrations: MigrationManifest = {
  3: (state: PersistedState): PersistedState => state,
  // v4: priceInUsd is now embedded on each TokenPrice entry. Clear the stale
  // prices cache so entries without priceInUsd are evicted immediately; they
  // will be re-fetched on next provider call rather than surfacing as UNKNOWN.
  4: (state: PersistedState): PersistedState => {
    if (!state) return state;
    const typed = state as unknown as TokenPricingState;
    return { ...typed, prices: {} } as unknown as PersistedState;
  },
};

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: tokenPricingReducers,
  persistConfig: {
    tokenPricing: {
      version: 4,
      whitelist: ['currencyPreference', 'prices', 'priceHistory'],
      migrate: createMigrate(migrations, { debug: false }),
    },
  },
  sideEffects: await initializeSideEffects(props, dependencies),
});

export default store;
export type * from './slice';
