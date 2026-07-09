import type { customDappsReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof customDappsReducers> {}
}
