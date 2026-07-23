import { DappId } from '@lace-contract/dapp-connector';
import { AccountId } from '@lace-contract/wallet-repo';
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
      sessionAccountByOrigin: {},
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

    describe('setSessionAccountForOrigin', () => {
      it('should bind an account id to an origin', () => {
        const action = actions.midnightDappConnector.setSessionAccountForOrigin(
          {
            origin: 'http://test-dapp.com',
            accountId: AccountId('account-0'),
          },
        );
        const state = reducers.midnightDappConnector(initialState, action);

        expect(state.sessionAccountByOrigin).toEqual({
          'http://test-dapp.com': AccountId('account-0'),
        });
      });

      it('should keep bindings for other origins independent', () => {
        const stateWithBinding: MidnightDappConnectorState = {
          ...initialState,
          sessionAccountByOrigin: {
            'http://other-dapp.com': AccountId('account-1'),
          },
        };
        const action = actions.midnightDappConnector.setSessionAccountForOrigin(
          {
            origin: 'http://test-dapp.com',
            accountId: AccountId('account-0'),
          },
        );
        const state = reducers.midnightDappConnector(stateWithBinding, action);

        expect(state.sessionAccountByOrigin).toEqual({
          'http://other-dapp.com': AccountId('account-1'),
          'http://test-dapp.com': AccountId('account-0'),
        });
      });

      it('should overwrite an existing binding for the same origin', () => {
        const stateWithBinding: MidnightDappConnectorState = {
          ...initialState,
          sessionAccountByOrigin: {
            'http://test-dapp.com': AccountId('account-0'),
          },
        };
        const action = actions.midnightDappConnector.setSessionAccountForOrigin(
          {
            origin: 'http://test-dapp.com',
            accountId: AccountId('account-1'),
          },
        );
        const state = reducers.midnightDappConnector(stateWithBinding, action);

        expect(state.sessionAccountByOrigin).toEqual({
          'http://test-dapp.com': AccountId('account-1'),
        });
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

    it('should select the session account mapping', () => {
      const sessionAccountByOrigin = {
        'http://test-dapp.com': AccountId('account-0'),
      };
      const state = {
        midnightDappConnector: { ...initialState, sessionAccountByOrigin },
      };
      const selected =
        selectors.midnightDappConnector.selectSessionAccountByOrigin(state);

      expect(selected).toEqual(sessionAccountByOrigin);
    });
  });
});
