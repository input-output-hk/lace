import {
  createAction,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { Dapp, DappId } from '@lace-contract/dapp-connector';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';

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
  /**
   * Maps dApp origin to the account ID selected for that dApp.
   * Each dApp maintains its own account selection independently.
   */
  sessionAccountByOrigin: Record<string, AccountId>;
};

const initialState: MidnightDappConnectorState = {
  proveTxRequest: null,
  signDataRequest: null,
  sessionAccountByOrigin: {},
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
    setSessionAccountForOrigin: (
      state,
      { payload }: PayloadAction<{ origin: string; accountId: AccountId }>,
    ) => {
      state.sessionAccountByOrigin[payload.origin] = payload.accountId;
    },
  },
  selectors: {
    selectProveTxRequest: (state: Readonly<MidnightDappConnectorState>) =>
      state.proveTxRequest,
    selectSignDataRequest: (state: Readonly<MidnightDappConnectorState>) =>
      state.signDataRequest,
    selectSessionAccountByOrigin: (
      state: Readonly<MidnightDappConnectorState>,
    ) => state.sessionAccountByOrigin,
  },
});

export const midnightDappConnectorReducers = {
  [slice.name]: slice.reducer,
};

const confirmDappTx = createAction('midnightDappConnector/confirmDappTx');
const rejectDappTx = createAction('midnightDappConnector/rejectDappTx');
const confirmSignData = createAction('midnightDappConnector/confirmSignData');
const rejectSignData = createAction('midnightDappConnector/rejectSignData');
const confirmConnect = createAction<{ account: AnyAccount; dappId: DappId }>(
  'midnightDappConnector/confirmConnect',
);

export const midnightDappConnectorActions = {
  midnightDappConnector: {
    ...slice.actions,
    confirmDappTx,
    rejectDappTx,
    confirmSignData,
    rejectSignData,
    confirmConnect,
  },
};

export const midnightDappConnectorSelectors = {
  midnightDappConnector: slice.selectors,
};
