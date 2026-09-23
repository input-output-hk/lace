import type { StakingCenterProductCardAddon } from './addon-types';
import type { stakingCenterReducers } from './store/slice';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof stakingCenterReducers> {}

  interface LaceAddons {
    readonly loadStakingCenterProductCard: DynamicallyLoadedInit<StakingCenterProductCardAddon>;
  }
}
