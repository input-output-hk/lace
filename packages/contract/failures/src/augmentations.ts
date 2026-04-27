import type { failuresReducers } from './store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof failuresReducers> {}
}
