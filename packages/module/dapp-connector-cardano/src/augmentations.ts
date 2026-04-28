import type { CardanoDappConnectorSideEffectDependencies } from './browser/store/dependencies';
import type { cardanoDappConnectorReducers } from './common/store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof cardanoDappConnectorReducers> {}

  interface SideEffectDependencies
    extends CardanoDappConnectorSideEffectDependencies {}
}
