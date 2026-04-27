import { DappId } from '@lace-contract/dapp-connector';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  midnightDappConnectorActions as actions,
  midnightDappConnectorSelectors as selectors,
  midnightDappConnectorReducers as reducers,
} from '../../src/store/slice';

import type { MidnightDappConnectorState } from '../../src/store';
import type { Dapp } from '@lace-contract/dapp-connector';

describe('midnight dapp connector slice', () => {
  let initialState: MidnightDappConnectorState;

  const testDapp: Dapp = {
    id: DappId('dapp1'),
    imageUrl: '',
    name: 'Test Dapp',
    origin: 'http://test-dapp.com',
  };

  beforeEach(() => {
    initialState = {
      proveTxRequest: null,
      signDataRequest: null,
    };
  });

  describe('reducers', () => {
    describe('setProveTxRequest', () => {
      it('should set the prove tx request', () => {
        const action = actions.midnightDappConnector.setProveTxRequest({
          dapp: testDapp,
          transactionType: 'shielded',
          transactionData: '{"test": "data"}',
        });
        const state = reducers.midnightDappConnector(initialState, action);

        expect(state.proveTxRequest).toEqual({
          dapp: testDapp,
          transactionType: 'shielded',
          transactionData: '{"test": "data"}',
        });
      });

      it('should clear the prove tx request', () => {
        const stateWithRequest: MidnightDappConnectorState = {
          ...initialState,
          proveTxRequest: {
            dapp: testDapp,
            transactionType: 'shielded',
            transactionData: null,
          },
        };
        const action = actions.midnightDappConnector.setProveTxRequest(null);
        const state = reducers.midnightDappConnector(stateWithRequest, action);

        expect(state.proveTxRequest).toBeNull();
      });
    });

    describe('setSignDataRequest', () => {
      it('should set the sign data request', () => {
        const action = actions.midnightDappConnector.setSignDataRequest({
          dapp: testDapp,
          payload: '48656c6c6f',
          keyType: 'unshielded',
        });
        const state = reducers.midnightDappConnector(initialState, action);

        expect(state.signDataRequest).toEqual({
          dapp: testDapp,
          payload: '48656c6c6f',
          keyType: 'unshielded',
        });
      });

      it('should clear the sign data request', () => {
        const stateWithRequest: MidnightDappConnectorState = {
          ...initialState,
          signDataRequest: {
            dapp: testDapp,
            payload: '48656c6c6f',
            keyType: 'unshielded',
          },
        };
        const action = actions.midnightDappConnector.setSignDataRequest(null);
        const state = reducers.midnightDappConnector(stateWithRequest, action);

        expect(state.signDataRequest).toBeNull();
      });
    });
  });

  describe('selectors', () => {
    it('should select the prove tx request', () => {
      const state = { midnightDappConnector: initialState };
      const selected =
        selectors.midnightDappConnector.selectProveTxRequest(state);

      expect(selected).toEqual(initialState.proveTxRequest);
    });

    it('should select the sign data request', () => {
      const state = { midnightDappConnector: initialState };
      const selected =
        selectors.midnightDappConnector.selectSignDataRequest(state);

      expect(selected).toEqual(initialState.signDataRequest);
    });

    it('should select the sign data request when set', () => {
      const signDataRequest = {
        dapp: testDapp,
        payload: '48656c6c6f',
        keyType: 'unshielded',
      };
      const state = {
        midnightDappConnector: { ...initialState, signDataRequest },
      };
      const selected =
        selectors.midnightDappConnector.selectSignDataRequest(state);

      expect(selected).toEqual(signDataRequest);
    });
  });
});
