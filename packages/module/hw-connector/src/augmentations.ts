import type { hwConnectorMobileReducers } from './mobile-store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof hwConnectorMobileReducers> {}
}
