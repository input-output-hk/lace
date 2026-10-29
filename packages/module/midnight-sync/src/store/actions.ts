import { createAction } from '@reduxjs/toolkit';

import type { AccountId } from '@lace-contract/wallet-repo';

const requestResync = createAction('midnight/requestResync');

const resync = createAction('midnight/resync');

const restartWalletWatch = createAction('midnight/restartWalletWatch');
const restartAccountWatch = createAction<{ accountId: AccountId }>(
  'midnight/restartAccountWatch',
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const midnightSyncActions = {
  midnightSync: {
    requestResync,
    resync,
    restartWalletWatch,
    restartAccountWatch,
  },
};
