import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { merge } from 'rxjs';

import {
  makeAwaitConfirmation,
  makeProcessing,
  swapContextSideEffects,
} from './side-effects';
import { swapContextReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [
    ...swapContextSideEffects,
    (actionObservables, stateObservables, dependencies) =>
      merge(
        makeAwaitConfirmation({
          confirmTx: makeConfirmTx(actionObservables.txExecutor),
        })(actionObservables, stateObservables, dependencies),
        makeProcessing({
          submitTx: makeSubmitTx(actionObservables.txExecutor),
        })(actionObservables, stateObservables, dependencies),
      ),
  ],
  reducers: swapContextReducers,
  persistConfig: {
    swapConfig: {
      version: 1,
      blacklist: ['tradableTokenIds'],
    },
  },
});

export default store;
