import { AccountId } from '@lace-contract/wallet-repo';
import { type DeepPartialTilObservable } from '@lace-lib/util-dev';
import { Ok } from '@lace-sdk/util';
import { firstValueFrom, of, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../src/common/api-error';
import { cardanoDappConnectorActions } from '../src/common/store/slice';
import {
  handleAuthResponse,
  handleSignTxRejection,
  processWebViewMessage,
} from '../src/mobile/store/side-effects';

import type { ActionCreators, Selectors } from '../src';
import type { Cip30MessageHandlerDependencies } from '../src/mobile/services/cip30-message-handler';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';

const navigationMocks = vi.hoisted(() => ({ navigate: vi.fn() }));
const cip30Mocks = vi.hoisted(() => ({ handleCip30Message: vi.fn() }));
const blockchainCardanoMocks = vi.hoisted(() => ({ signData: vi.fn() }));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { sheets: { navigate: navigationMocks.navigate } },
  SheetRoutes: {
    AuthorizeDapp: 'AuthorizeDapp',
    SignData: 'SignData',
    SignTx: 'SignTx',
  },
}));

vi.mock('@lace-contract/cardano-context', async () => {
  const { of } = await import('rxjs');
  return {
    cardanoAccountUtxos$: of({}),
    cardanoAccountUnspendableUtxos$: of({}),
    cardanoRewardAccountDetails$: of({}),
    cardanoAddresses$: of([]),
    cardanoChainId$: of(undefined),
    isCardanoAccount: () => true,
  };
});

vi.mock('@lace-module/blockchain-cardano', () => ({
  signData: blockchainCardanoMocks.signData,
}));

vi.mock('../src/mobile/services/cip30-message-handler', () => ({
  handleCip30Message: cip30Mocks.handleCip30Message,
}));

// Shared test helpers
const createMessage = (id: string, type: string) => ({
  id,
  type,
  source: 'lace-cip30' as const,
});

const createDependencies = () => ({
  actions: cardanoDappConnectorActions,
  cardanoProvider: {
    submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
  },
});

const createBaseStateObservables = (
  sessionOrigins: string[] = [],
  sessionAccountByOrigin: Record<string, ReturnType<typeof AccountId>> = {},
) => ({
  cardanoDappConnector: {
    selectSessionAuthorizedOrigins$: of(sessionOrigins),
    selectSessionAccountByOrigin$: of(sessionAccountByOrigin),
    selectPendingAuthRequest$: of(null),
  },
  dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
  cardanoContext: {
    selectAccountTransactionHistory$: of({}),
  },
  addresses: { selectAllAddresses$: of([]) },
  wallets: { selectActiveNetworkAccounts$: of([]), selectAll$: of([]) },
});

const invokeProcessWebViewMessage = (
  action: ReturnType<
    typeof cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage
  >,
  stateOverrides: DeepPartialTilObservable<StateObservables<Selectors>> = {},
) => {
  const base = createBaseStateObservables();
  const actionObservables = {
    cardanoDappConnector: { receiveWebViewMessage$: of(action) },
  };
  const stateObservables = {
    ...base,
    ...stateOverrides,
    // Deep-merge cardanoDappConnector so overrides don't drop base observables
    // like selectPendingAuthRequest$ that are required by withLatestFrom.
    cardanoDappConnector: {
      ...base.cardanoDappConnector,
      ...stateOverrides.cardanoDappConnector,
    },
  };
  return processWebViewMessage(
    actionObservables as unknown as ActionObservables<ActionCreators>,
    stateObservables as unknown as StateObservables<Selectors>,
    createDependencies() as unknown as SideEffectDependencies &
      WithLaceContext<Selectors, ActionCreators>,
  );
};

describe('mobile side effects', () => {
  beforeEach(() => {
    navigationMocks.navigate.mockReset();
    cip30Mocks.handleCip30Message.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processWebViewMessage', () => {
    it('emits setWebViewResponse when CIP30 handler returns response_ready', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(123);
      const message = createMessage('req-1', 'getNetworkId');
      const dappOrigin = 'https://allowed.example';

      let capturedDeps: Cip30MessageHandlerDependencies | undefined;
      cip30Mocks.handleCip30Message.mockImplementation(async (_m, _o, deps) => {
        capturedDeps = deps as Cip30MessageHandlerDependencies;
        return {
          type: 'response_ready',
          response: { id: message.id, success: true, result: 'ok' },
        };
      });

      const action =
        cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage({
          message,
          dappOrigin,
          timestamp: 0,
        });

      const output$ = invokeProcessWebViewMessage(action, {
        cardanoDappConnector: {
          selectSessionAuthorizedOrigins$: of([dappOrigin]),
          selectSessionAccountByOrigin$: of({
            [dappOrigin]: AccountId('acc-1'),
          }),
        },
      });

      const emitted = await firstValueFrom(output$.pipe(take(1)));
      expect(emitted).toEqual(
        cardanoDappConnectorActions.cardanoDappConnector.setWebViewResponse({
          id: message.id,
          success: true,
          result: 'ok',
          timestamp: 123,
        }),
      );

      expect(cip30Mocks.handleCip30Message).toHaveBeenCalledTimes(1);
      expect(capturedDeps?.isSessionAuthorized(dappOrigin)).toBe(true);
      expect(capturedDeps?.isSessionAuthorized('https://other.example')).toBe(
        false,
      );
    });

    it('navigates and emits setPendingAuthRequest when authorization required', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(123);
      const message = createMessage('req-2', 'enable');
      const dappOrigin = 'https://dapp.example';
      // Navigation format has icon and category for UI display
      const expectedNavDapp = {
        icon: { fallback: 'D' },
        name: 'dapp.example',
        category: 'DApp',
      };
      // Redux state format has name and origin for serialization
      const expectedDappInfo = {
        name: 'dapp.example',
        origin: dappOrigin,
      };

      cip30Mocks.handleCip30Message.mockResolvedValue({
        type: 'authorization_required',
        requestId: message.id,
        dappOrigin,
        dappName: 'dapp.example',
      });

      const action =
        cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage({
          message,
          dappOrigin,
          timestamp: 0,
        });

      const output$ = invokeProcessWebViewMessage(action);
      const emitted = await firstValueFrom(output$.pipe(take(1)));

      expect(navigationMocks.navigate).toHaveBeenCalledWith(
        'AuthorizeDapp',
        expect.objectContaining({ dappOrigin, dapp: expectedNavDapp }),
      );
      expect(emitted).toEqual(
        cardanoDappConnectorActions.cardanoDappConnector.setPendingAuthRequest({
          requestId: message.id,
          dappOrigin,
          dapp: expectedDappInfo,
        }),
      );
    });

    it('emits setWebViewResponse with InternalError when handler rejects', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(456);
      const message = createMessage('req-3', 'getBalance');

      cip30Mocks.handleCip30Message.mockRejectedValue(new Error('boom'));

      const action =
        cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage({
          message,
          dappOrigin: 'https://dapp.example',
          timestamp: 0,
        });

      const output$ = invokeProcessWebViewMessage(action, {
        cardanoDappConnector: {
          selectSessionAuthorizedOrigins$: of([]),
          selectSessionAccountByOrigin$: of({}),
        },
      });
      const emitted = await firstValueFrom(output$.pipe(take(1)));

      expect(emitted).toEqual(
        cardanoDappConnectorActions.cardanoDappConnector.setWebViewResponse({
          id: message.id,
          success: false,
          error: { code: APIErrorCode.InternalError, info: 'boom' },
          timestamp: 456,
        }),
      );
    });
  });

  describe('handleAuthResponse', () => {
    const invokeHandleAuthResponse = (
      lastAuthResponse: {
        requestId: string;
        authorized: boolean;
        timestamp: number;
      } | null,
    ) => {
      const stateObservables = {
        cardanoDappConnector: { selectLastAuthResponse$: of(lastAuthResponse) },
      };
      return handleAuthResponse(
        {} as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        createDependencies() as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );
    };

    it.each([
      {
        scenario: 'authorized',
        authorized: true,
        timestamp: 111,
        expectedResponse: {
          id: 'auth-1',
          success: true,
          result: true,
          timestamp: 111,
        },
      },
      {
        scenario: 'not authorized',
        authorized: false,
        timestamp: 222,
        expectedResponse: {
          id: 'auth-1',
          success: false,
          error: {
            code: APIErrorCode.Refused,
            info: 'User declined authorization',
          },
          timestamp: 222,
        },
      },
    ])(
      'emits WebViewResponse + clearLastAuthResponse when $scenario',
      async ({ authorized, timestamp, expectedResponse }) => {
        vi.spyOn(Date, 'now').mockReturnValue(timestamp);

        const output$ = invokeHandleAuthResponse({
          requestId: 'auth-1',
          authorized,
          timestamp: 0,
        });
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([
          cardanoDappConnectorActions.cardanoDappConnector.setWebViewResponse(
            expectedResponse,
          ),
          cardanoDappConnectorActions.cardanoDappConnector.clearLastAuthResponse(),
        ]);
      },
    );

    it('ignores null lastAuthResponse emissions', async () => {
      const output$ = invokeHandleAuthResponse(null);
      const emitted = await firstValueFrom(output$.pipe(toArray()));
      expect(emitted).toEqual([]);
    });
  });

  describe('processWebViewMessage - signTx handling', () => {
    it('navigates to SignTx sheet and emits setPendingSignTxRequest for signing_required with signingType signTx', async () => {
      const message = createMessage('req-signTx-1', 'signTx');
      const dappOrigin = 'https://dapp.example';
      const txHex = 'abcd1234';
      // Navigation format has icon for UI display
      const expectedNavDapp = {
        icon: { fallback: 'D' },
        name: 'dapp.example',
        origin: dappOrigin,
      };
      // Redux state format has name and origin for serialization
      const expectedDappInfo = {
        name: 'dapp.example',
        origin: dappOrigin,
      };

      cip30Mocks.handleCip30Message.mockResolvedValue({
        type: 'signing_required',
        requestId: message.id,
        dappOrigin,
        dappName: 'dapp.example',
        signingType: 'signTx',
        txHex,
        partialSign: false,
      });

      const action =
        cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage({
          message,
          dappOrigin,
          timestamp: 0,
        });

      const output$ = invokeProcessWebViewMessage(action, {
        cardanoDappConnector: {
          selectSessionAuthorizedOrigins$: of([dappOrigin]),
          selectSessionAccountByOrigin$: of({
            [dappOrigin]: AccountId('acc-1'),
          }),
        },
      });

      const emitted = await firstValueFrom(output$.pipe(take(1)));

      expect(navigationMocks.navigate).toHaveBeenCalledWith('SignTx', {
        requestId: message.id,
        dapp: expectedNavDapp,
        txHex,
        partialSign: false,
      });
      expect(emitted).toEqual(
        cardanoDappConnectorActions.cardanoDappConnector.setPendingSignTxRequest(
          {
            requestId: message.id,
            dappOrigin,
            dapp: expectedDappInfo,
            txHex,
            partialSign: false,
          },
        ),
      );
    });

    it('passes partialSign: true when specified', async () => {
      const message = createMessage('req-signTx-2', 'signTx');
      const dappOrigin = 'https://dapp.example';
      const txHex = 'efgh5678';

      cip30Mocks.handleCip30Message.mockResolvedValue({
        type: 'signing_required',
        requestId: message.id,
        dappOrigin,
        dappName: 'dapp.example',
        signingType: 'signTx',
        txHex,
        partialSign: true,
      });

      const action =
        cardanoDappConnectorActions.cardanoDappConnector.receiveWebViewMessage({
          message,
          dappOrigin,
          timestamp: 0,
        });

      const output$ = invokeProcessWebViewMessage(action, {
        cardanoDappConnector: {
          selectSessionAuthorizedOrigins$: of([dappOrigin]),
          selectSessionAccountByOrigin$: of({
            [dappOrigin]: AccountId('acc-1'),
          }),
        },
      });

      const emitted: unknown = await firstValueFrom(output$.pipe(take(1)));

      expect(navigationMocks.navigate).toHaveBeenCalledWith(
        'SignTx',
        expect.objectContaining({ partialSign: true }),
      );
      expect(emitted).toEqual(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          payload: expect.objectContaining({ partialSign: true }),
        }),
      );
    });
  });

  describe('handleSignTxRejection', () => {
    const invokeHandleSignTxRejection = (
      pendingRequest: {
        requestId: string;
        dappOrigin: string;
        dapp: { icon: { fallback: string }; name: string; origin: string };
        txHex: string;
        partialSign: boolean;
      } | null,
    ) => {
      const actionObservables = {
        cardanoDappConnector: {
          rejectSignTx$: of({ type: 'rejectSignTx' }),
        },
      };
      const stateObservables = {
        cardanoDappConnector: {
          selectPendingSignTxRequest$: of(pendingRequest),
        },
      };
      return handleSignTxRejection(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        createDependencies() as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );
    };

    it('emits error response and clears pending request on rejection', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(789);

      const pendingRequest = {
        requestId: 'tx-1',
        dappOrigin: 'https://dapp.example',
        dapp: {
          icon: { fallback: 'D' },
          name: 'dapp.example',
          origin: 'https://dapp.example',
        },
        txHex: 'abcd1234',
        partialSign: false,
      };

      const output$ = invokeHandleSignTxRejection(pendingRequest);
      const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

      expect(emitted).toEqual([
        cardanoDappConnectorActions.cardanoDappConnector.setWebViewResponse({
          id: 'tx-1',
          success: false,
          error: {
            code: APIErrorCode.Refused,
            info: 'User declined to sign transaction',
          },
          timestamp: 789,
        }),
        cardanoDappConnectorActions.cardanoDappConnector.clearPendingSignTxRequest(),
      ]);
    });

    it('ignores null pending request', async () => {
      const output$ = invokeHandleSignTxRejection(null);
      const emitted = await firstValueFrom(output$.pipe(toArray()));
      expect(emitted).toEqual([]);
    });
  });
});
