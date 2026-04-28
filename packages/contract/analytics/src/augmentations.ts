import type { analyticsReducers } from './store/slice';
import type { AnalyticsProvider } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends AnalyticsProvider {}

  interface State
    extends StateFromReducersMapObject<typeof analyticsReducers> {}
}
