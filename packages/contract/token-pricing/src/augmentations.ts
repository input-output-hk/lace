import type { TokenPricingProviderDependency } from './dependencies';
import type { tokenPricingReducers } from './store';
import type { TokenIdMapper } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof tokenPricingReducers> {}

  interface SideEffectDependencies extends TokenPricingProviderDependency {}

  interface LaceAddons {
    readonly loadTokenIdMapper: DynamicallyLoadedInit<TokenIdMapper>;
  }
}
