import type { sendFlowReducers } from './store/slice';
import type {
  SendFlowAddressValidator,
  BaseTokenSelector,
  SendFlowAnalyticsEnhancer,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof sendFlowReducers> {}

  interface LaceAddons {
    readonly loadAddressValidator: DynamicallyLoadedInit<SendFlowAddressValidator>;
    readonly loadBaseToken: DynamicallyLoadedInit<BaseTokenSelector>;
    readonly loadSendFlowAnalyticsEnhancers: DynamicallyLoadedInit<SendFlowAnalyticsEnhancer>;
  }
}
