import type { PostHogAnalyticsDependencies } from './store/dependencies';
import type { posthogAnalyticsReducers } from './store/slice';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof posthogAnalyticsReducers> {}
  interface SideEffectDependencies extends PostHogAnalyticsDependencies {}
}
