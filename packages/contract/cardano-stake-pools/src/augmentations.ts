import type { cardanoStakePoolsReducers } from './store';
import type { CardanoStakePoolsProviderDependencies } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof cardanoStakePoolsReducers> {}

  interface SideEffectDependencies
    extends CardanoStakePoolsProviderDependencies {}
}
