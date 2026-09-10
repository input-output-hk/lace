import { createAction } from '@reduxjs/toolkit';

const requestResync = createAction('midnight/requestResync');

const resync = createAction('midnight/resync');

const restartWalletWatch = createAction('midnight/restartWalletWatch');

/** Direct import of this is an anti-pattern. OK for tests. */
export const midnightSyncActions = {
  midnightSync: {
    requestResync,
    resync,
    restartWalletWatch,
  },
};
