import type { notificationCenterReducers } from './store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof notificationCenterReducers> {}
}
