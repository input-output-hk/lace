import type { onlineStatusReducers } from './store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof onlineStatusReducers> {}
}
