import type { MakeTxExecutorImplementation } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';

declare module '@lace-contract/module' {
  interface LaceAddons {
    readonly loadTxExecutorImplementation: DynamicallyLoadedInit<MakeTxExecutorImplementation>;
  }
}
