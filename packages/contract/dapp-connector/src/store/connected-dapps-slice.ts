import { createSlice } from '@reduxjs/toolkit';

import { DappId } from '../value-objects';

import type { DappConnection } from '../types';
import type { ConnectionContextId } from '../value-objects';
import type { BlockchainName } from '@lace-lib/util-store';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * State structure: map of DappId to array of active connections
 * Multiple connections per dApp (e.g., multiple tabs on same origin)
 */
export type ConnectedDappsDataSlice = {
  byDappId: Record<DappId, DappConnection[]>;
};

const initialState: ConnectedDappsDataSlice = {
  byDappId: {},
};

export const connectedDappsSlice = createSlice({
  name: 'connectedDapps',
  initialState,
  reducers: {
    dappConnected: (state, { payload }: PayloadAction<DappConnection>) => {
      const dappId = DappId(new URL(payload.source.url).origin);
      const existingConnections = state.byDappId[dappId] || [];
      state.byDappId[dappId] = [...existingConnections, payload];
    },
    dappDisconnected: (
      state,
      { payload: dappContextId }: PayloadAction<ConnectionContextId>,
    ) => {
      (Object.keys(state.byDappId) as DappId[]).forEach(dappId => {
        const connections = state.byDappId[dappId];
        const filtered = connections.filter(
          conn => conn.source.contextId !== dappContextId,
        );

        if (filtered.length === 0) {
          delete state.byDappId[dappId];
        } else {
          state.byDappId[dappId] = filtered;
        }
      });
    },
  },
  selectors: {
    selectConnectedDapps: state => state.byDappId,
    selectAreAnyDappsOfBlockchainConnected:
      state => (blockchainName: BlockchainName) =>
        Object.values(state.byDappId).some(connections =>
          connections.some(conn => conn.blockchainName === blockchainName),
        ),
  },
});
