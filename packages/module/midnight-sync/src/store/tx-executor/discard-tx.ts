import { of } from 'rxjs';

import type { TxExecutorImplementation } from '@lace-contract/tx-executor';

export const discardTx: TxExecutorImplementation['discardTx'] = () =>
  of({
    success: true,
  });
