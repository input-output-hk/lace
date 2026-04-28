import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { networkSelectors } from '@lace-contract/network';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';

import type { ProviderFailure } from '@cardano-sdk/core';
import type {
  BitcoinBlockInfo,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

export type BitcoinHistoryFetchError = {
  accountId: AccountId;
  failure: string;
};

export type BitcoinContextState = {
  tip?: BitcoinBlockInfo;
  historyFetchErrors: BitcoinHistoryFetchError[];
};

const initialState: BitcoinContextState = {
  historyFetchErrors: [],
};

const slice = createSlice({
  name: 'bitcoinContext',
  initialState,
  reducers: {
    getAddressTransactionHistoryFailed: (
      state,
      action: PayloadAction<BitcoinHistoryFetchError>,
    ) => {
      state.historyFetchErrors.push(action.payload);
    },
    setTip: (
      state,
      { payload }: PayloadAction<BitcoinBlockInfo | undefined>,
    ) => {
      state.tip = payload;
    },
  },
  selectors: {
    selectTip: ({ tip }) => tip,
    bitcoinContext: sliceState => sliceState,
  },
});

const selectBlockchainNetworkId = createSelector(
  networkSelectors.network.selectNetworkType,
  networkSelectors.network.selectBlockchainNetworks,
  (networkType, blockchainNetworks) =>
    blockchainNetworks.Bitcoin?.[networkType] as BitcoinNetworkId | undefined,
);

const selectNetwork = createSelector(
  selectBlockchainNetworkId,
  (networkId): BitcoinNetwork | undefined =>
    networkId
      ? networkId.includes('mainnet')
        ? BitcoinNetwork.Mainnet
        : BitcoinNetwork.Testnet
      : undefined,
);

export const bitcoinContextReducers = {
  [slice.name]: slice.reducer,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const bitcoinContextActions = {
  bitcoinContext: {
    ...slice.actions,
    getTipFailed: createAction<{
      network: BitcoinNetwork;
      failure: ProviderFailure;
    }>('bitcoinContext/getTipFailed'),
    requestResync: createAction<{
      accountId: AccountId;
    }>('bitcoin/requestResync'),
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const bitcoinContextSelectors = {
  bitcoinContext: {
    ...slice.selectors,
    selectBlockchainNetworkId,
    selectNetwork,
  },
};
