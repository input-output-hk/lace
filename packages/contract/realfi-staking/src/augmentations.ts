import type { RealFiProviderDependencies } from './provider-types';
import type { realfiStakingReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof realfiStakingReducers> {}
  interface SideEffectDependencies extends RealFiProviderDependencies {}
}
