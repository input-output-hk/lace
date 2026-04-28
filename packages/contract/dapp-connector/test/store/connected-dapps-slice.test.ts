import { describe, expect, it } from 'vitest';

import { ConnectionContextId, DappId } from '../../src';
import { connectedDappsSlice } from '../../src/store/connected-dapps-slice';

import type { DappConnection } from '../../src/types';

describe('connectedDappsSlice', () => {
  const { reducer, actions } = connectedDappsSlice;

  const mockConnection: DappConnection = {
    blockchainName: 'Midnight',
    source: {
      url: 'https://example.com',
      contextId: ConnectionContextId('tab-123-frame-0'),
    },
  };

  const mockConnection2: DappConnection = {
    blockchainName: 'Midnight',
    source: {
      url: 'https://example.com',
      contextId: ConnectionContextId('tab-456-frame-0'),
    },
  };

  const mockConnection3: DappConnection = {
    blockchainName: 'Cardano',
    source: {
      url: 'https://other.com',
      contextId: ConnectionContextId('tab-789-frame-0'),
    },
  };

  describe('dappConnected', () => {
    it('should add a connection to byDappId', () => {
      const state = reducer(undefined, actions.dappConnected(mockConnection));

      const dappId = DappId('https://example.com');
      expect(state.byDappId[dappId]).toEqual([mockConnection]);
    });

    it('should add multiple connections for the same dApp', () => {
      let state = reducer(undefined, actions.dappConnected(mockConnection));
      state = reducer(state, actions.dappConnected(mockConnection2));

      const dappId = DappId('https://example.com');
      expect(state.byDappId[dappId]).toHaveLength(2);
      expect(state.byDappId[dappId]).toEqual([mockConnection, mockConnection2]);
    });

    it('should handle multiple different dApps', () => {
      let state = reducer(undefined, actions.dappConnected(mockConnection));
      state = reducer(state, actions.dappConnected(mockConnection3));

      expect(Object.keys(state.byDappId)).toHaveLength(2);
      expect(state.byDappId[DappId('https://example.com')]).toEqual([
        mockConnection,
      ]);
      expect(state.byDappId[DappId('https://other.com')]).toEqual([
        mockConnection3,
      ]);
    });
  });

  describe('dappDisconnected', () => {
    it('should remove connection by contextId', () => {
      let state = reducer(undefined, actions.dappConnected(mockConnection));
      state = reducer(state, actions.dappConnected(mockConnection2));

      state = reducer(
        state,
        actions.dappDisconnected(mockConnection.source.contextId),
      );

      const dappId = DappId('https://example.com');
      expect(state.byDappId[dappId]).toHaveLength(1);
      expect(state.byDappId[dappId][0]).toEqual(mockConnection2);
    });

    it('should remove dappId key when last connection is removed', () => {
      let state = reducer(undefined, actions.dappConnected(mockConnection));

      state = reducer(
        state,
        actions.dappDisconnected(mockConnection.source.contextId),
      );

      expect(state.byDappId).toEqual({});
    });

    it('should handle disconnection of non-existent contextId gracefully', () => {
      const state = reducer(undefined, actions.dappConnected(mockConnection));

      const newState = reducer(
        state,
        actions.dappDisconnected(ConnectionContextId('non-existent')),
      );

      // Should not throw, state unchanged
      expect(newState).toEqual(state);
    });
  });

  describe('selectors', () => {
    describe('selectConnectedDapps', () => {
      it('should return byDappId map', () => {
        const sliceState = reducer(
          undefined,
          actions.dappConnected(mockConnection),
        );
        const fullState = { connectedDapps: sliceState };
        const result =
          connectedDappsSlice.selectors.selectConnectedDapps(fullState);
        expect(result).toEqual(sliceState.byDappId);
      });
    });

    describe('selectAreAnyDappsOfBlockchainConnected', () => {
      it('should return true when dApps for the blockchain exist', () => {
        const sliceState = reducer(
          undefined,
          actions.dappConnected(mockConnection),
        );
        const fullState = { connectedDapps: sliceState };
        const hasConnectedDapps =
          connectedDappsSlice.selectors.selectAreAnyDappsOfBlockchainConnected(
            fullState,
          )('Midnight');
        expect(hasConnectedDapps).toBe(true);
      });

      it('should return false when no dApps for the blockchain exist', () => {
        const sliceState = reducer(
          undefined,
          actions.dappConnected(mockConnection),
        );
        const fullState = { connectedDapps: sliceState };
        const hasConnectedDapps =
          connectedDappsSlice.selectors.selectAreAnyDappsOfBlockchainConnected(
            fullState,
          )('Cardano');
        expect(hasConnectedDapps).toBe(false);
      });

      it('should return false for empty state', () => {
        const sliceState = reducer(undefined, { type: 'INIT' });
        const fullState = { connectedDapps: sliceState };
        const hasConnectedDapps =
          connectedDappsSlice.selectors.selectAreAnyDappsOfBlockchainConnected(
            fullState,
          )('Midnight');
        expect(hasConnectedDapps).toBe(false);
      });

      it('should filter by blockchain name correctly', () => {
        let sliceState = reducer(
          undefined,
          actions.dappConnected(mockConnection),
        ); // Midnight
        sliceState = reducer(
          sliceState,
          actions.dappConnected(mockConnection3),
        ); // Cardano
        const fullState = { connectedDapps: sliceState };

        expect(
          connectedDappsSlice.selectors.selectAreAnyDappsOfBlockchainConnected(
            fullState,
          )('Midnight'),
        ).toBe(true);
        expect(
          connectedDappsSlice.selectors.selectAreAnyDappsOfBlockchainConnected(
            fullState,
          )('Cardano'),
        ).toBe(true);
      });
    });
  });
});
