import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cardanoDappConnectorActions,
  cardanoDappConnectorReducers,
  cardanoDappConnectorSelectors,
} from '../src/common/store/slice';

import type {
  CardanoDappConnectorState,
  DappInfo,
  PendingAuthRequest,
  PendingSignDataRequest,
  PendingSignTxRequest,
  WebViewResponse,
} from '../src/common/store/slice';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const { cardanoDappConnector: reducer } =
  cardanoDappConnectorReducers as unknown as {
    cardanoDappConnector: (
      state: CardanoDappConnectorState | undefined,
      action: unknown,
    ) => CardanoDappConnectorState;
  };

const { cardanoDappConnector: actions } = cardanoDappConnectorActions;
const { cardanoDappConnector: selectors } = cardanoDappConnectorSelectors;

const createInitialState = (): CardanoDappConnectorState => ({
  pendingAuthRequest: null,
  lastAuthResponse: null,
  sessionAuthorizedOrigins: [],
  sessionAccountByOrigin: {},
  resolvedTransactionInputs: null,
  pendingSignDataRequest: null,
  pendingSignTxRequest: null,
  signTxCompleted: false,
  signTxError: false,
  signTxHwErrorKeys: null,
  signDataCompleted: false,
  signDataError: false,
  signDataHwErrorKeys: null,
  webViewResponseQueue: [],
});

const sessionAccount: AnyAccount = {
  accountId: AccountId('cardano-account-1'),
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  blockchainNetworkId: BlockchainNetworkId('cardano-1'),
  blockchainSpecific: {
    extendedAccountPublicKey: '',
  },
  metadata: { name: 'Cardano Account 1' },
  networkType: 'testnet',
  walletId: WalletId('wallet-1'),
};

const mockDappInfo: DappInfo = {
  name: 'Test DApp',
  origin: 'https://dapp.example',
  imageUrl: 'https://dapp.example/icon.png',
};

const createMockPendingRequest = (
  requestId = 'req-1',
  origin = 'https://dapp.example',
): PendingAuthRequest => ({
  requestId,
  dappOrigin: origin,
  dapp: { ...mockDappInfo, origin },
});

const createStateWithPendingRequest = (
  origins: string[] = [],
): CardanoDappConnectorState => ({
  ...createInitialState(),
  pendingAuthRequest: createMockPendingRequest(),
  sessionAuthorizedOrigins: origins,
});

describe('cardanoDappConnector slice', () => {
  describe('reducers', () => {
    describe('setPendingAuthRequest', () => {
      it.each([
        {
          action: 'sets',
          payload: createMockPendingRequest(),
          expected: createMockPendingRequest(),
        },
        { action: 'clears when null', payload: null, expected: null },
      ])('$action the pending auth request', ({ payload, expected }) => {
        const initialState = payload
          ? createInitialState()
          : createStateWithPendingRequest();
        const nextState = reducer(
          initialState,
          actions.setPendingAuthRequest(payload),
        );
        expect(nextState.pendingAuthRequest).toEqual(expected);
      });
    });

    describe('clearPendingAuthRequest', () => {
      it('clears the pending auth request', () => {
        const nextState = reducer(
          createStateWithPendingRequest(),
          actions.clearPendingAuthRequest(),
        );
        expect(nextState.pendingAuthRequest).toBeNull();
      });
    });

    describe('clearLastAuthResponse', () => {
      it('clears the last auth response', () => {
        const initialState = {
          ...createInitialState(),
          lastAuthResponse: {
            requestId: 'req-1',
            authorized: true,
            timestamp: 123,
            account: sessionAccount,
          },
        };
        const nextState = reducer(
          initialState,
          actions.clearLastAuthResponse(),
        );
        expect(nextState.lastAuthResponse).toBeNull();
      });
    });

    describe('addSessionAuthorizedOrigin', () => {
      it.each([
        {
          description: 'adds a new origin',
          initial: [],
          origin: 'https://dapp.example',
          expected: ['https://dapp.example'],
        },
        {
          description: 'does not add duplicate origins',
          initial: ['https://dapp.example'],
          origin: 'https://dapp.example',
          expected: ['https://dapp.example'],
        },
        {
          description: 'adds multiple different origins',
          initial: ['https://dapp1.example'],
          origin: 'https://dapp2.example',
          expected: ['https://dapp1.example', 'https://dapp2.example'],
        },
      ])('$description', ({ initial, origin, expected }) => {
        const initialState = {
          ...createInitialState(),
          sessionAuthorizedOrigins: initial,
        };
        const nextState = reducer(
          initialState,
          actions.addSessionAuthorizedOrigin(origin),
        );
        expect(nextState.sessionAuthorizedOrigins).toEqual(expected);
      });
    });

    describe('clearSessionAuthorizedOrigins', () => {
      it('clears all session authorized origins', () => {
        const initialState = {
          ...createInitialState(),
          sessionAuthorizedOrigins: [
            'https://dapp1.example',
            'https://dapp2.example',
          ],
        };
        const nextState = reducer(
          initialState,
          actions.clearSessionAuthorizedOrigins(),
        );
        expect(nextState.sessionAuthorizedOrigins).toEqual([]);
      });
    });

    describe('receiveWebViewMessage', () => {
      it('is a no-op (does not modify state)', () => {
        const initialState = createInitialState();
        const nextState = reducer(
          initialState,
          actions.receiveWebViewMessage({
            message: { id: 'req-1', type: 'enable', source: 'lace-cip30' },
            dappOrigin: 'https://dapp.example',
            timestamp: 123,
          }),
        );
        expect(nextState).toEqual(initialState);
      });
    });

    describe('setWebViewResponse', () => {
      it.each([
        {
          description: 'success response',
          response: {
            id: 'req-1',
            success: true,
            result: { enabled: true },
            timestamp: 123,
          },
        },
        {
          description: 'error response',
          response: {
            id: 'req-1',
            success: false,
            error: { code: -3, info: 'Refused' },
            timestamp: 456,
          },
        },
      ])('adds $description to queue', ({ response }) => {
        const nextState = reducer(
          createInitialState(),
          actions.setWebViewResponse(response as WebViewResponse),
        );
        expect(nextState.webViewResponseQueue).toContainEqual(response);
        expect(nextState.webViewResponseQueue).toHaveLength(1);
      });

      it('adds multiple responses to queue', () => {
        const response1 = {
          id: 'req-1',
          success: true,
          result: true,
          timestamp: 123,
        };
        const response2 = {
          id: 'req-2',
          success: true,
          result: false,
          timestamp: 124,
        };
        let state = createInitialState();
        state = reducer(
          state,
          actions.setWebViewResponse(response1 as WebViewResponse),
        );
        state = reducer(
          state,
          actions.setWebViewResponse(response2 as WebViewResponse),
        );
        expect(state.webViewResponseQueue).toHaveLength(2);
        expect(state.webViewResponseQueue).toContainEqual(response1);
        expect(state.webViewResponseQueue).toContainEqual(response2);
      });
    });

    describe('clearWebViewResponse', () => {
      it('clears specific response by id', () => {
        const initialState = {
          ...createInitialState(),
          webViewResponseQueue: [
            { id: 'req-1', success: true, result: true, timestamp: 123 },
            { id: 'req-2', success: true, result: false, timestamp: 124 },
          ],
        };
        const nextState = reducer(
          initialState,
          actions.clearWebViewResponse('req-1'),
        );
        expect(nextState.webViewResponseQueue).toHaveLength(1);
        expect(nextState.webViewResponseQueue[0].id).toBe('req-2');
      });

      it('clears first response when no id specified', () => {
        const initialState = {
          ...createInitialState(),
          webViewResponseQueue: [
            { id: 'req-1', success: true, result: true, timestamp: 123 },
            { id: 'req-2', success: true, result: false, timestamp: 124 },
          ],
        };
        const nextState = reducer(
          initialState,
          actions.clearWebViewResponse(undefined),
        );
        expect(nextState.webViewResponseQueue).toHaveLength(1);
        expect(nextState.webViewResponseQueue[0].id).toBe('req-2');
      });

      it('handles empty queue gracefully', () => {
        const initialState = createInitialState();
        const nextState = reducer(
          initialState,
          actions.clearWebViewResponse('req-1'),
        );
        expect(nextState.webViewResponseQueue).toHaveLength(0);
      });
    });
  });

  describe('extra reducers', () => {
    describe('confirmAuth', () => {
      beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(999);
      });

      it.each([
        {
          description: 'authorized: sets lastAuthResponse and adds origin',
          authorized: true,
          initialOrigins: [],
          expectedOrigins: ['https://dapp.example'],
          expectedAuthorized: true,
        },
        {
          description: 'authorized with existing origin: no duplicate',
          authorized: true,
          initialOrigins: ['https://dapp.example'],
          expectedOrigins: ['https://dapp.example'],
          expectedAuthorized: true,
        },
        {
          description:
            'not authorized: sets lastAuthResponse without adding origin',
          authorized: false,
          initialOrigins: [],
          expectedOrigins: [],
          expectedAuthorized: false,
        },
      ])(
        '$description',
        ({
          authorized,
          initialOrigins,
          expectedOrigins,
          expectedAuthorized,
        }) => {
          const initialState = createStateWithPendingRequest(initialOrigins);
          const nextState = reducer(
            initialState,
            actions.confirmAuth({ authorized, account: sessionAccount }),
          );

          expect(nextState.lastAuthResponse).toEqual({
            account: sessionAccount,
            requestId: 'req-1',
            authorized: expectedAuthorized,
            timestamp: 999,
          });
          expect(nextState.pendingAuthRequest).toBeNull();
          expect(nextState.sessionAuthorizedOrigins).toEqual(expectedOrigins);
        },
      );

      it('does nothing when there is no pending auth request', () => {
        const initialState = createInitialState();
        const nextState = reducer(
          initialState,
          actions.confirmAuth({ authorized: true, account: sessionAccount }),
        );
        expect(nextState).toEqual(initialState);
      });
    });

    describe('rejectAuth', () => {
      beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(888);
      });

      it('sets lastAuthResponse with authorized=false and clears pendingAuthRequest', () => {
        const nextState = reducer(
          createStateWithPendingRequest(),
          actions.rejectAuth(),
        );
        expect(nextState.lastAuthResponse).toEqual({
          account: null,
          requestId: 'req-1',
          authorized: false,
          timestamp: 888,
        });
        expect(nextState.pendingAuthRequest).toBeNull();
      });

      it('does not modify sessionAuthorizedOrigins', () => {
        const initialState = createStateWithPendingRequest([
          'https://other.example',
        ]);
        const nextState = reducer(initialState, actions.rejectAuth());
        expect(nextState.sessionAuthorizedOrigins).toEqual([
          'https://other.example',
        ]);
      });

      it('does nothing when there is no pending auth request', () => {
        const initialState = createInitialState();
        const nextState = reducer(initialState, actions.rejectAuth());
        expect(nextState).toEqual(initialState);
      });
    });
  });

  describe('unified pending request reducers', () => {
    const mockPendingSignTxRequest: PendingSignTxRequest = {
      requestId: 'signTx-req-1',
      dappOrigin: 'https://dapp.example',
      dapp: mockDappInfo,
      txHex: 'abcdef1234',
      partialSign: false,
    };

    const mockPendingSignDataRequest: PendingSignDataRequest = {
      requestId: 'signData-req-1',
      dappOrigin: 'https://dapp.example',
      dapp: mockDappInfo,
      address: 'addr_test1...',
      payload: 'cafebabe',
    };

    describe('setPendingSignTxRequest', () => {
      it('sets the pending signTx request', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setPendingSignTxRequest(mockPendingSignTxRequest),
        );
        expect(nextState.pendingSignTxRequest).toEqual(
          mockPendingSignTxRequest,
        );
      });

      it('resets signTxCompleted flag when setting new request', () => {
        const initialState = {
          ...createInitialState(),
          signTxCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignTxRequest(mockPendingSignTxRequest),
        );
        expect(nextState.signTxCompleted).toBe(false);
      });

      it('resets signTxError flag when setting new request', () => {
        const initialState = {
          ...createInitialState(),
          signTxError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignTxRequest(mockPendingSignTxRequest),
        );
        expect(nextState.signTxError).toBe(false);
      });

      it('clears the pending signTx request when null', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignTxRequest: mockPendingSignTxRequest,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignTxRequest(null),
        );
        expect(nextState.pendingSignTxRequest).toBeNull();
      });
    });

    describe('clearPendingSignTxRequest', () => {
      it('clears the pending signTx request', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignTxRequest: mockPendingSignTxRequest,
        };
        const nextState = reducer(
          initialState,
          actions.clearPendingSignTxRequest(),
        );
        expect(nextState.pendingSignTxRequest).toBeNull();
      });
    });

    describe('setPendingSignDataRequest', () => {
      it('sets the pending signData request', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setPendingSignDataRequest(mockPendingSignDataRequest),
        );
        expect(nextState.pendingSignDataRequest).toEqual(
          mockPendingSignDataRequest,
        );
      });

      it('resets signDataCompleted flag when setting new request', () => {
        const initialState = {
          ...createInitialState(),
          signDataCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignDataRequest(mockPendingSignDataRequest),
        );
        expect(nextState.signDataCompleted).toBe(false);
      });

      it('resets signDataError flag when setting new request', () => {
        const initialState = {
          ...createInitialState(),
          signDataError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignDataRequest(mockPendingSignDataRequest),
        );
        expect(nextState.signDataError).toBe(false);
      });

      it('clears the pending signData request when null', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignDataRequest: mockPendingSignDataRequest,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignDataRequest(null),
        );
        expect(nextState.pendingSignDataRequest).toBeNull();
      });
    });

    describe('clearPendingSignDataRequest', () => {
      it('clears the pending signData request', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignDataRequest: mockPendingSignDataRequest,
        };
        const nextState = reducer(
          initialState,
          actions.clearPendingSignDataRequest(),
        );
        expect(nextState.pendingSignDataRequest).toBeNull();
      });
    });

    describe('setSignTxCompleted', () => {
      it('sets signTxCompleted to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignTxCompleted(true),
        );
        expect(nextState.signTxCompleted).toBe(true);
      });

      it('sets signTxCompleted to false', () => {
        const initialState = {
          ...createInitialState(),
          signTxCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignTxCompleted(false),
        );
        expect(nextState.signTxCompleted).toBe(false);
      });
    });

    describe('setSignDataCompleted', () => {
      it('sets signDataCompleted to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignDataCompleted(true),
        );
        expect(nextState.signDataCompleted).toBe(true);
      });

      it('sets signDataCompleted to false', () => {
        const initialState = {
          ...createInitialState(),
          signDataCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignDataCompleted(false),
        );
        expect(nextState.signDataCompleted).toBe(false);
      });
    });

    describe('setSignTxError', () => {
      it('sets signTxError to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignTxError(true),
        );
        expect(nextState.signTxError).toBe(true);
      });

      it('sets signTxError to false', () => {
        const initialState = {
          ...createInitialState(),
          signTxError: true,
        };
        const nextState = reducer(initialState, actions.setSignTxError(false));
        expect(nextState.signTxError).toBe(false);
      });
    });

    describe('setSignDataError', () => {
      it('sets signDataError to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignDataError(true),
        );
        expect(nextState.signDataError).toBe(true);
      });

      it('sets signDataError to false', () => {
        const initialState = {
          ...createInitialState(),
          signDataError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignDataError(false),
        );
        expect(nextState.signDataError).toBe(false);
      });
    });
  });

  describe('extension-only actions', () => {
    it('confirmConnect action is defined', () => {
      expect(actions.confirmConnect).toBeDefined();
      expect(actions.confirmConnect({ account: sessionAccount }).type).toBe(
        'cardanoDappConnector/confirmConnect',
      );
    });

    it('rejectConnect action is defined', () => {
      expect(actions.rejectConnect).toBeDefined();
      expect(actions.rejectConnect().type).toBe(
        'cardanoDappConnector/rejectConnect',
      );
    });

    it('confirmSignTx action is defined', () => {
      expect(actions.confirmSignTx).toBeDefined();
      expect(actions.confirmSignTx().type).toBe(
        'cardanoDappConnector/confirmSignTx',
      );
    });

    it('rejectSignTx action is defined', () => {
      expect(actions.rejectSignTx).toBeDefined();
      expect(actions.rejectSignTx().type).toBe(
        'cardanoDappConnector/rejectSignTx',
      );
    });

    it('confirmSignData action is defined', () => {
      expect(actions.confirmSignData).toBeDefined();
      expect(actions.confirmSignData().type).toBe(
        'cardanoDappConnector/confirmSignData',
      );
    });

    it('rejectSignData action is defined', () => {
      expect(actions.rejectSignData).toBeDefined();
      expect(actions.rejectSignData().type).toBe(
        'cardanoDappConnector/rejectSignData',
      );
    });
  });

  describe('unified pending request selectors', () => {
    const createRootState = (sliceState: CardanoDappConnectorState) => ({
      cardanoDappConnector: sliceState,
    });

    const mockPendingSignTxRequest: PendingSignTxRequest = {
      requestId: 'signTx-req-1',
      dappOrigin: 'https://dapp.example',
      dapp: mockDappInfo,
      txHex: 'abcdef1234',
      partialSign: false,
    };

    const mockPendingSignDataRequest: PendingSignDataRequest = {
      requestId: 'signData-req-1',
      dappOrigin: 'https://dapp.example',
      dapp: mockDappInfo,
      address: 'addr_test1...',
      payload: 'cafebabe',
    };

    describe('selectPendingSignTxRequest', () => {
      it('returns null when no pending signTx request', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectPendingSignTxRequest(state)).toBeNull();
      });

      it('returns the pending signTx request when set', () => {
        const state = createRootState({
          ...createInitialState(),
          pendingSignTxRequest: mockPendingSignTxRequest,
        });
        expect(selectors.selectPendingSignTxRequest(state)).toEqual(
          mockPendingSignTxRequest,
        );
      });
    });

    describe('selectPendingSignDataRequest', () => {
      it('returns null when no pending signData request', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectPendingSignDataRequest(state)).toBeNull();
      });

      it('returns the pending signData request when set', () => {
        const state = createRootState({
          ...createInitialState(),
          pendingSignDataRequest: mockPendingSignDataRequest,
        });
        expect(selectors.selectPendingSignDataRequest(state)).toEqual(
          mockPendingSignDataRequest,
        );
      });
    });

    describe('selectSignTxCompleted', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignTxCompleted(state)).toBe(false);
      });

      it('returns true when signTxCompleted is true', () => {
        const state = createRootState({
          ...createInitialState(),
          signTxCompleted: true,
        });
        expect(selectors.selectSignTxCompleted(state)).toBe(true);
      });
    });

    describe('selectSignDataCompleted', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignDataCompleted(state)).toBe(false);
      });

      it('returns true when signDataCompleted is true', () => {
        const state = createRootState({
          ...createInitialState(),
          signDataCompleted: true,
        });
        expect(selectors.selectSignDataCompleted(state)).toBe(true);
      });
    });

    describe('selectSignTxError', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignTxError(state)).toBe(false);
      });

      it('returns true when signTxError is true', () => {
        const state = createRootState({
          ...createInitialState(),
          signTxError: true,
        });
        expect(selectors.selectSignTxError(state)).toBe(true);
      });
    });

    describe('selectSignDataError', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignDataError(state)).toBe(false);
      });

      it('returns true when signDataError is true', () => {
        const state = createRootState({
          ...createInitialState(),
          signDataError: true,
        });
        expect(selectors.selectSignDataError(state)).toBe(true);
      });
    });
  });
});
