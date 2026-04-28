import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { createMigrate } from 'redux-persist';
import { merge } from 'rxjs';

import { addUkFcaDisclaimerAcknowledged } from './migrations';
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
      version: 2,
      blacklist: ['tradableTokenIds'],
      migrate: createMigrate({
        2: addUkFcaDisclaimerAcknowledged,
      }),
    },
  },
});

export default store;
