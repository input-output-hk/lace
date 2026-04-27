import type { MidnightSideDappConnectorEffectsDependencies } from './store/dependencies';
import type { midnightDappConnectorReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof midnightDappConnectorReducers> {}

  interface SideEffectDependencies
    extends MidnightSideDappConnectorEffectsDependencies {}
}
