import { initializeSideEffects } from './side-effects';
import { tokenPricingReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: tokenPricingReducers,
  persistConfig: {
    tokenPricing: {
      version: 2,
      whitelist: ['currencyPreference', 'prices', 'priceHistory'],
    },
  },
  sideEffects: await initializeSideEffects(props, dependencies),
});

export default store;
export type * from './slice';
