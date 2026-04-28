import {
  createAction,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { Dapp } from '@lace-contract/dapp-connector';

type ProveTxRequest = {
  dapp: Dapp;
  transactionType: 'shielded' | 'unshielded' | null;
  transactionData: string | null;
};

type SignDataRequest = {
  dapp: Dapp;
  payload: string;
  keyType: string;
};

export type MidnightDappConnectorState = {
  proveTxRequest: ProveTxRequest | null;
  signDataRequest: SignDataRequest | null;
};

const initialState: MidnightDappConnectorState = {
  proveTxRequest: null,
  signDataRequest: null,
};

const slice = createSlice({
  name: 'midnightDappConnector',
  initialState,
  reducers: {
    setProveTxRequest: (
      state,
      { payload }: PayloadAction<ProveTxRequest | null>,
    ) => {
      state.proveTxRequest = payload;
    },
    setSignDataRequest: (
      state,
      { payload }: PayloadAction<SignDataRequest | null>,
    ) => {
      state.signDataRequest = payload;
    },
  },
  selectors: {
    selectProveTxRequest: (state: Readonly<MidnightDappConnectorState>) =>
      state.proveTxRequest,
    selectSignDataRequest: (state: Readonly<MidnightDappConnectorState>) =>
      state.signDataRequest,
  },
});

export const midnightDappConnectorReducers = {
  [slice.name]: slice.reducer,
};

const confirmDappTx = createAction('midnightDappConnector/confirmDappTx');
const rejectDappTx = createAction('midnightDappConnector/rejectDappTx');
const confirmSignData = createAction('midnightDappConnector/confirmSignData');
const rejectSignData = createAction('midnightDappConnector/rejectSignData');

export const midnightDappConnectorActions = {
  midnightDappConnector: {
    ...slice.actions,
    confirmDappTx,
    rejectDappTx,
    confirmSignData,
    rejectSignData,
  },
};

export const midnightDappConnectorSelectors = {
  midnightDappConnector: slice.selectors,
};
