import { dappConnectorActions, DappId } from '@lace-contract/dapp-connector';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  bitcoinDappConnectorActions,
  bitcoinDappConnectorReducers,
  bitcoinDappConnectorSelectors,
} from '../../src/store/slice';

import type {
  BitcoinDappConnectorState,
  DappInfo,
  PendingSignMessageRequest,
  PendingSignPsbtRequest,
  ResolvedPreviousOut,
} from '../../src/store/slice';

const { bitcoinDappConnector: reducer } =
  bitcoinDappConnectorReducers as unknown as {
    bitcoinDappConnector: (
      state: BitcoinDappConnectorState | undefined,
      action: unknown,
    ) => BitcoinDappConnectorState;
  };

const { bitcoinDappConnector: actions } = bitcoinDappConnectorActions;
const { bitcoinDappConnector: selectors } = bitcoinDappConnectorSelectors;

const createInitialState = (): BitcoinDappConnectorState => ({
  pendingSignMessageRequest: null,
  pendingSignPsbtRequest: null,
  resolvedInputs: { status: 'idle', prevOuts: {} },
  signMessageCompleted: false,
  signMessageError: false,
  signPsbtCompleted: false,
  signPsbtError: false,
  sessionAccountByOrigin: {},
});

const mockDappInfo: DappInfo = {
  name: 'Test DApp',
  origin: 'https://dapp.example',
  imageUrl: 'https://dapp.example/icon.png',
};

const mockPendingSignMessageRequest: PendingSignMessageRequest = {
  requestId: 'signMessage-req-1',
  dappOrigin: 'https://dapp.example',
  dapp: mockDappInfo,
  address: 'bc1q...',
  message: 'hello world',
  signatureType: 'ecdsa',
};

const mockPendingSignPsbtRequest: PendingSignPsbtRequest = {
  requestId: 'signPsbt-req-1',
  dappOrigin: 'https://dapp.example',
  dapp: mockDappInfo,
  psbtsBase64: ['psbt-1', 'psbt-2', 'psbt-3'],
  currentIndex: 0,
};

const mockResolvedPreviousOuts: Record<string, ResolvedPreviousOut> = {
  'abcd:0': { value: 1000, scriptHex: '0014abcd' },
};

describe('bitcoinDappConnector slice', () => {
  describe('reducers', () => {
    describe('setPendingSignMessageRequest', () => {
      it('sets the pending signMessage request', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setPendingSignMessageRequest(mockPendingSignMessageRequest),
        );
        expect(nextState.pendingSignMessageRequest).toEqual(
          mockPendingSignMessageRequest,
        );
      });

      it('resets signMessageCompleted flag when setting a new request', () => {
        const initialState = {
          ...createInitialState(),
          signMessageCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignMessageRequest(mockPendingSignMessageRequest),
        );
        expect(nextState.signMessageCompleted).toBe(false);
      });

      it('resets signMessageError flag when setting a new request', () => {
        const initialState = {
          ...createInitialState(),
          signMessageError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignMessageRequest(mockPendingSignMessageRequest),
        );
        expect(nextState.signMessageError).toBe(false);
      });

      it('clears the pending signMessage request when null', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignMessageRequest: mockPendingSignMessageRequest,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignMessageRequest(null),
        );
        expect(nextState.pendingSignMessageRequest).toBeNull();
      });
    });

    describe('clearPendingSignMessageRequest', () => {
      it('clears the pending signMessage request', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignMessageRequest: mockPendingSignMessageRequest,
        };
        const nextState = reducer(
          initialState,
          actions.clearPendingSignMessageRequest(),
        );
        expect(nextState.pendingSignMessageRequest).toBeNull();
      });
    });

    describe('setPendingSignPsbtRequest', () => {
      it('sets the pending signPsbt request', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setPendingSignPsbtRequest(mockPendingSignPsbtRequest),
        );
        expect(nextState.pendingSignPsbtRequest).toEqual(
          mockPendingSignPsbtRequest,
        );
      });

      it('represents a single signPsbt call as a one-element batch', () => {
        const singleRequest: PendingSignPsbtRequest = {
          ...mockPendingSignPsbtRequest,
          psbtsBase64: ['solo-psbt'],
        };
        const nextState = reducer(
          createInitialState(),
          actions.setPendingSignPsbtRequest(singleRequest),
        );
        expect(nextState.pendingSignPsbtRequest?.psbtsBase64).toEqual([
          'solo-psbt',
        ]);
      });

      it('resets signPsbtCompleted flag when setting a new request', () => {
        const initialState = {
          ...createInitialState(),
          signPsbtCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignPsbtRequest(mockPendingSignPsbtRequest),
        );
        expect(nextState.signPsbtCompleted).toBe(false);
      });

      it('resets signPsbtError flag when setting a new request', () => {
        const initialState = {
          ...createInitialState(),
          signPsbtError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignPsbtRequest(mockPendingSignPsbtRequest),
        );
        expect(nextState.signPsbtError).toBe(false);
      });

      it('resets resolvedInputs when setting a new request', () => {
        const initialState = {
          ...createInitialState(),
          resolvedInputs: {
            status: 'resolved' as const,
            prevOuts: mockResolvedPreviousOuts,
          },
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignPsbtRequest(mockPendingSignPsbtRequest),
        );
        expect(nextState.resolvedInputs).toEqual({
          status: 'idle',
          prevOuts: {},
        });
      });

      it('clears the pending signPsbt request when null', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignPsbtRequest: mockPendingSignPsbtRequest,
        };
        const nextState = reducer(
          initialState,
          actions.setPendingSignPsbtRequest(null),
        );
        expect(nextState.pendingSignPsbtRequest).toBeNull();
      });
    });

    describe('clearPendingSignPsbtRequest', () => {
      it('clears the pending signPsbt request', () => {
        const initialState = {
          ...createInitialState(),
          pendingSignPsbtRequest: mockPendingSignPsbtRequest,
        };
        const nextState = reducer(
          initialState,
          actions.clearPendingSignPsbtRequest(),
        );
        expect(nextState.pendingSignPsbtRequest).toBeNull();
      });
    });

    describe('setPsbtPagerIndex', () => {
      const stateWithRequest = (): BitcoinDappConnectorState => ({
        ...createInitialState(),
        pendingSignPsbtRequest: mockPendingSignPsbtRequest,
      });

      it('sets the pager index within bounds', () => {
        const nextState = reducer(
          stateWithRequest(),
          actions.setPsbtPagerIndex(1),
        );
        expect(nextState.pendingSignPsbtRequest?.currentIndex).toBe(1);
      });

      it('clamps a negative index to 0', () => {
        const nextState = reducer(
          stateWithRequest(),
          actions.setPsbtPagerIndex(-5),
        );
        expect(nextState.pendingSignPsbtRequest?.currentIndex).toBe(0);
      });

      it('clamps an index past the last psbt to the last index', () => {
        const nextState = reducer(
          stateWithRequest(),
          actions.setPsbtPagerIndex(10),
        );
        expect(nextState.pendingSignPsbtRequest?.currentIndex).toBe(2);
      });

      it('is a no-op when there is no pending signPsbt request', () => {
        const initialState = createInitialState();
        const nextState = reducer(initialState, actions.setPsbtPagerIndex(1));
        expect(nextState).toEqual(initialState);
      });
    });

    describe('startResolvingInputs', () => {
      it('sets status to resolving and clears prevOuts', () => {
        const initialState = {
          ...createInitialState(),
          resolvedInputs: {
            status: 'failed' as const,
            prevOuts: mockResolvedPreviousOuts,
          },
        };
        const nextState = reducer(initialState, actions.startResolvingInputs());
        expect(nextState.resolvedInputs).toEqual({
          status: 'resolving',
          prevOuts: {},
        });
      });
    });

    describe('setResolvedInputs', () => {
      it('sets status to resolved with the given prevOuts', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setResolvedInputs(mockResolvedPreviousOuts),
        );
        expect(nextState.resolvedInputs).toEqual({
          status: 'resolved',
          prevOuts: mockResolvedPreviousOuts,
        });
      });
    });

    describe('failResolvingInputs', () => {
      it('sets status to failed', () => {
        const initialState = {
          ...createInitialState(),
          resolvedInputs: { status: 'resolving' as const, prevOuts: {} },
        };
        const nextState = reducer(initialState, actions.failResolvingInputs());
        expect(nextState.resolvedInputs.status).toBe('failed');
      });
    });

    describe('setSignMessageCompleted', () => {
      it('sets signMessageCompleted to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignMessageCompleted(true),
        );
        expect(nextState.signMessageCompleted).toBe(true);
      });

      it('sets signMessageCompleted to false', () => {
        const initialState = {
          ...createInitialState(),
          signMessageCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignMessageCompleted(false),
        );
        expect(nextState.signMessageCompleted).toBe(false);
      });
    });

    describe('setSignMessageError', () => {
      it('sets signMessageError to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignMessageError(true),
        );
        expect(nextState.signMessageError).toBe(true);
      });

      it('sets signMessageError to false', () => {
        const initialState = {
          ...createInitialState(),
          signMessageError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignMessageError(false),
        );
        expect(nextState.signMessageError).toBe(false);
      });
    });

    describe('setSignPsbtCompleted', () => {
      it('sets signPsbtCompleted to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignPsbtCompleted(true),
        );
        expect(nextState.signPsbtCompleted).toBe(true);
      });

      it('sets signPsbtCompleted to false', () => {
        const initialState = {
          ...createInitialState(),
          signPsbtCompleted: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignPsbtCompleted(false),
        );
        expect(nextState.signPsbtCompleted).toBe(false);
      });
    });

    describe('setSignPsbtError', () => {
      it('sets signPsbtError to true', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSignPsbtError(true),
        );
        expect(nextState.signPsbtError).toBe(true);
      });

      it('sets signPsbtError to false', () => {
        const initialState = {
          ...createInitialState(),
          signPsbtError: true,
        };
        const nextState = reducer(
          initialState,
          actions.setSignPsbtError(false),
        );
        expect(nextState.signPsbtError).toBe(false);
      });
    });

    describe('setSessionAccountForOrigin', () => {
      it('sets the account id for the given origin', () => {
        const nextState = reducer(
          createInitialState(),
          actions.setSessionAccountForOrigin({
            origin: 'https://dapp.example',
            accountId: AccountId('bitcoin-account-1'),
          }),
        );
        expect(nextState.sessionAccountByOrigin).toEqual({
          'https://dapp.example': AccountId('bitcoin-account-1'),
        });
      });

      it('keeps existing origins when adding a new one', () => {
        const initialState = {
          ...createInitialState(),
          sessionAccountByOrigin: {
            'https://dapp1.example': AccountId('acc-1'),
          },
        };
        const nextState = reducer(
          initialState,
          actions.setSessionAccountForOrigin({
            origin: 'https://dapp2.example',
            accountId: AccountId('acc-2'),
          }),
        );
        expect(nextState.sessionAccountByOrigin).toEqual({
          'https://dapp1.example': AccountId('acc-1'),
          'https://dapp2.example': AccountId('acc-2'),
        });
      });
    });
  });

  describe('extra reducers', () => {
    describe('removeAuthorizedDapp (from @lace-contract/dapp-connector)', () => {
      it('clears the session account for the removed Bitcoin dApp', () => {
        const initialState: BitcoinDappConnectorState = {
          ...createInitialState(),
          sessionAccountByOrigin: {
            'https://dapp1.example': AccountId('acc-1'),
            'https://dapp2.example': AccountId('acc-2'),
          },
        };
        const nextState = reducer(
          initialState,
          dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
            blockchainName: 'Bitcoin',
            dapp: { id: DappId('https://dapp1.example') },
          }),
        );
        expect(nextState.sessionAccountByOrigin).toEqual({
          'https://dapp2.example': AccountId('acc-2'),
        });
      });

      it('ignores removeAuthorizedDapp for non-Bitcoin blockchains', () => {
        const initialState: BitcoinDappConnectorState = {
          ...createInitialState(),
          sessionAccountByOrigin: {
            'https://dapp1.example': AccountId('acc-1'),
          },
        };
        const nextState = reducer(
          initialState,
          dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
            blockchainName: 'Cardano',
            dapp: { id: DappId('https://dapp1.example') },
          }),
        );
        expect(nextState).toEqual(initialState);
      });
    });
  });

  describe('plain actions', () => {
    it('confirmSignMessage action is defined', () => {
      expect(actions.confirmSignMessage).toBeDefined();
      expect(actions.confirmSignMessage().type).toBe(
        'bitcoinDappConnector/confirmSignMessage',
      );
    });

    it('rejectSignMessage action is defined', () => {
      expect(actions.rejectSignMessage).toBeDefined();
      expect(actions.rejectSignMessage().type).toBe(
        'bitcoinDappConnector/rejectSignMessage',
      );
    });

    it('confirmSignPsbt action is defined', () => {
      expect(actions.confirmSignPsbt).toBeDefined();
      expect(actions.confirmSignPsbt().type).toBe(
        'bitcoinDappConnector/confirmSignPsbt',
      );
    });

    it('rejectSignPsbt action is defined', () => {
      expect(actions.rejectSignPsbt).toBeDefined();
      expect(actions.rejectSignPsbt().type).toBe(
        'bitcoinDappConnector/rejectSignPsbt',
      );
    });

    it('closePopupRequested carries the popup location', () => {
      expect(actions.closePopupRequested('/bitcoin-dapp-sign-tx')).toEqual({
        type: 'bitcoinDappConnector/closePopupRequested',
        payload: '/bitcoin-dapp-sign-tx',
      });
    });
  });

  describe('selectors', () => {
    const createRootState = (sliceState: BitcoinDappConnectorState) => ({
      bitcoinDappConnector: sliceState,
    });

    describe('selectPendingSignMessageRequest', () => {
      it('returns null when there is no pending request', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectPendingSignMessageRequest(state)).toBeNull();
      });

      it('returns the pending signMessage request when set', () => {
        const state = createRootState({
          ...createInitialState(),
          pendingSignMessageRequest: mockPendingSignMessageRequest,
        });
        expect(selectors.selectPendingSignMessageRequest(state)).toEqual(
          mockPendingSignMessageRequest,
        );
      });
    });

    describe('selectPendingSignPsbtRequest', () => {
      it('returns null when there is no pending request', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectPendingSignPsbtRequest(state)).toBeNull();
      });

      it('returns the pending signPsbt request when set', () => {
        const state = createRootState({
          ...createInitialState(),
          pendingSignPsbtRequest: mockPendingSignPsbtRequest,
        });
        expect(selectors.selectPendingSignPsbtRequest(state)).toEqual(
          mockPendingSignPsbtRequest,
        );
      });
    });

    describe('selectResolvedInputs', () => {
      it('returns the idle status by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectResolvedInputs(state)).toEqual({
          status: 'idle',
          prevOuts: {},
        });
      });

      it('returns the resolved prevOuts once set', () => {
        const state = createRootState({
          ...createInitialState(),
          resolvedInputs: {
            status: 'resolved',
            prevOuts: mockResolvedPreviousOuts,
          },
        });
        expect(selectors.selectResolvedInputs(state)).toEqual({
          status: 'resolved',
          prevOuts: mockResolvedPreviousOuts,
        });
      });
    });

    describe('selectSignMessageCompleted', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignMessageCompleted(state)).toBe(false);
      });

      it('returns true when set', () => {
        const state = createRootState({
          ...createInitialState(),
          signMessageCompleted: true,
        });
        expect(selectors.selectSignMessageCompleted(state)).toBe(true);
      });
    });

    describe('selectSignMessageError', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignMessageError(state)).toBe(false);
      });

      it('returns true when set', () => {
        const state = createRootState({
          ...createInitialState(),
          signMessageError: true,
        });
        expect(selectors.selectSignMessageError(state)).toBe(true);
      });
    });

    describe('selectSignPsbtCompleted', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignPsbtCompleted(state)).toBe(false);
      });

      it('returns true when set', () => {
        const state = createRootState({
          ...createInitialState(),
          signPsbtCompleted: true,
        });
        expect(selectors.selectSignPsbtCompleted(state)).toBe(true);
      });
    });

    describe('selectSignPsbtError', () => {
      it('returns false by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSignPsbtError(state)).toBe(false);
      });

      it('returns true when set', () => {
        const state = createRootState({
          ...createInitialState(),
          signPsbtError: true,
        });
        expect(selectors.selectSignPsbtError(state)).toBe(true);
      });
    });

    describe('selectSessionAccountByOrigin', () => {
      it('returns an empty map by default', () => {
        const state = createRootState(createInitialState());
        expect(selectors.selectSessionAccountByOrigin(state)).toEqual({});
      });

      it('returns the per-origin account map when set', () => {
        const state = createRootState({
          ...createInitialState(),
          sessionAccountByOrigin: {
            'https://dapp.example': AccountId('acc-1'),
          },
        });
        expect(selectors.selectSessionAccountByOrigin(state)).toEqual({
          'https://dapp.example': AccountId('acc-1'),
        });
      });
    });
  });
});
