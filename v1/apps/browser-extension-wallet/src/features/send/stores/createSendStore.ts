import create, { UseStore } from 'zustand';
import { sendTransactionSlice, sendCancelModalSlice } from './slices';
import { SendStore } from './types';

/**
 * returns the instantiated store
 */
export const createSendStore = (): UseStore<SendStore> =>
  create((set, get, api) => ({
    ...sendTransactionSlice(set, get, api),
    ...sendCancelModalSlice(set, get, api)
  }));
