import type { passportReducers } from './store';
import type { PassportDependencies } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof passportReducers> {}
  interface SideEffectDependencies extends PassportDependencies {}
}
