import { type TxExecutorImplementation } from '@lace-contract/tx-executor';
import { of } from 'rxjs';

export const makeDiscardTx = (): TxExecutorImplementation['discardTx'] => () =>
  of({
    success: true,
  });
