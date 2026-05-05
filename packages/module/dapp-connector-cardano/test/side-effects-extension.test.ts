import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { testSideEffect } from '@lace-lib/util-dev';
import { Ok } from '@lace-sdk/util';
import { EMPTY, NEVER, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearResolvedInputsOnSignTxClear,
  closeRequestedPopup,
  connectCardanoDappConnectorApi,
  initializeSideEffects,
  promptCardanoAuthorizeDapp,
  resolveForeignTransactionInputs,
} from '../src/browser/store/side-effects';
import { signData$, signTx$ } from '../src/browser/store/util';

import type { ActionCreators, Selectors } from '../src';
import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type { Dapp } from '@lace-contract/dapp-connector';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

// Type for handleRequests function
type HandleRequestsFunction = (
  request$: Observable<CardanoConfirmationRequest>,
) => Observable<unknown>;

// Type for the mock connectCardanoDappConnector argument
interface ConnectCardanoDappConnectorArgument {
  handleRequests: HandleRequestsFunction;
  authorizedDapps$: Observable<unknown>;
  accountUtxos$: Observable<unknown>;
  addresses$: Observable<unknown>;
  chainId$: Observable<unknown>;
  getAccountIdForOrigin: (origin: string) => unknown;
}

// Mock the utility functions
// Note: connect$ is not mocked because it's not used by handleRequests
// (enable() goes through authenticator channel -> promptCardanoAuthorizeDapp)
vi.mock('../src/browser/store/util', async () => {
  const actual = await vi.importActual('../src/browser/store/util');
  return {
    ...actual,
    signTx$: vi.fn().mockReturnValue(of({ type: 'SIGN_TX_ACTION' })),
    signData$: vi.fn().mockReturnValue(of({ type: 'SIGN_DATA_ACTION' })),
    detectViewClosure: vi.fn().mockReturnValue(EMPTY),
  };
});

const mockDapp: Dapp = {
  id: DappId('https://test-dapp.com'),
  name: 'Test DApp',
  origin: 'https://test-dapp.com',
  imageUrl: 'https://test-dapp.com/favicon.ico',
};

describe('side-effects-extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectCardanoDappConnectorApi', () => {
    const createActionObservables = () => ({
      cardanoDappConnector: {
        confirmConnect$: new Subject<void>(),
        rejectConnect$: new Subject<void>(),
        confirmSignTx$: new Subject<void>(),
        rejectSignTx$: new Subject<void>(),
        confirmSignData$: new Subject<void>(),
        rejectSignData$: new Subject<void>(),
      },
      views: {
        viewDisconnected$: new Subject<{ payload: string }>(),
      },
    });

    const createStateObservables = () => ({
      views: { selectOpenViews$: of([]) },
      appLock: { isUnlocked$: of(true) },
      dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
      cardanoContext: {
        selectChainId$: of(undefined),
        selectAccountUtxos$: of({}),
        selectAvailableAccountUtxos$: of({}),
      },
      addresses: { selectAllAddresses$: of([]) },
      cardanoDappConnector: { selectSessionAccountByOrigin$: of({}) },
      wallets: { selectActiveNetworkAccounts$: of([]) },
    });

    const createDependencies = (
      handleRequestsImplementation?: (
        request$: Observable<CardanoConfirmationRequest>,
      ) => Observable<unknown>,
    ) => {
      const requestSubject = new Subject<CardanoConfirmationRequest>();

      const mockConnectCardanoDappConnector = vi.fn(
        (
          argument: ConnectCardanoDappConnectorArgument,
        ): Observable<unknown> => {
          // Store the handleRequests function and call it with the request subject
          if (handleRequestsImplementation) {
            return handleRequestsImplementation(requestSubject);
          }
          return argument.handleRequests(requestSubject);
        },
      );

      return {
        connectCardanoDappConnector: mockConnectCardanoDappConnector,
        actions: {
          views: { openView: vi.fn(), closeView: vi.fn() },
          cardanoDappConnector: {
            setConnectRequest: vi.fn(),
            setSignTxRequest: vi.fn(),
            setSignDataRequest: vi.fn(),
          },
        },
        authenticate: vi.fn().mockReturnValue(of(true)),
        accessAuthSecret: vi.fn((callback: (secret: Uint8Array) => unknown) =>
          callback(new Uint8Array([1, 2, 3])),
        ),
        cardanoProvider: {
          submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
        },
        requestSubject,
        // Helper to get handleRequests from mock call
        getHandleRequests: () => {
          const calls = mockConnectCardanoDappConnector.mock
            .calls as ConnectCardanoDappConnectorArgument[][];
          return calls[0][0].handleRequests;
        },
      };
    };

    it('should call connectCardanoDappConnector with correct parameters', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies(() => EMPTY);

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      expect(deps.connectCardanoDappConnector).toHaveBeenCalledTimes(1);
      expect(deps.connectCardanoDappConnector).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizedDapps$:
            stateObservables.dappConnector.selectAuthorizedDapps$,
          accountUtxos$:
            stateObservables.cardanoContext.selectAvailableAccountUtxos$,
          addresses$: stateObservables.addresses.selectAllAddresses$,
          chainId$: stateObservables.cardanoContext.selectChainId$,
          getAccountIdForOrigin: expect.any(Function) as (
            origin: string,
          ) => unknown,
          handleRequests: expect.any(Function) as HandleRequestsFunction,
        }),
      );
    });

    // Note: 'connect' type requests are NOT routed through handleRequests.
    // enable() uses the authenticator channel -> authorizeDapp.start -> promptCardanoAuthorizeDapp
    // The handleRequests callback only handles signTx and signData.

    it('should route signTx requests to signTx$ utility', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signTx',
          }) as CardanoConfirmationRequest,
          selectOpenViews$: stateObservables.views.selectOpenViews$,
          actions: deps.actions,
        }),
      );
    });

    it('should route signTx requests when app is unlocked (e.g. AwaitingSetup)', () => {
      const actionObservables = createActionObservables();
      const stateObservables = {
        ...createStateObservables(),
        appLock: {
          isUnlocked$: of(true),
        },
      };
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signTx',
          }) as CardanoConfirmationRequest,
        }),
      );
    });

    it('should block signTx requests when app is locked', () => {
      const actionObservables = createActionObservables();
      const stateObservables = {
        ...createStateObservables(),
        appLock: {
          isUnlocked$: of(false),
        },
      };
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).not.toHaveBeenCalled();
    });

    it('should route signData requests to signData$ utility', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signData',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        signDataAddress: 'addr_test1...',
        signDataPayload: 'cafebabe',
      });

      expect(signData$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signData',
          }) as CardanoConfirmationRequest,
          selectOpenViews$: stateObservables.views.selectOpenViews$,
          actions: deps.actions,
        }),
      );
    });

    it('should return EMPTY for unknown request types', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      // Use 'unknown' to represent an unknown request type
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      // Emit a request with an unknown type (cast to bypass type checking)
      requestSubject.next({
        type: 'unknownType',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
      } as unknown as CardanoConfirmationRequest);

      // Should not call any utility function
      expect(signTx$).not.toHaveBeenCalled();
      expect(signData$).not.toHaveBeenCalled();
      expect(emissions).toHaveLength(0);
    });
  });

  describe('promptCardanoAuthorizeDapp', () => {
    const sidePanelView = {
      id: ViewId('sidePanel1'),
      location: '/',
      type: 'sidePanel' as const,
      windowId: 1,
    };

    const popupView = {
      id: ViewId('popup1'),
      location: '/cardano-dapp-connect',
      type: 'popupWindow' as const,
    };

    const mockAccount = {
      accountId: 'account-1',
      blockchainName: 'Cardano',
    } as unknown as AnyAccount;

    const startAction = (windowId?: number) => ({
      type: 'authorizeDapp/start' as const,
      payload: {
        dapp: mockDapp,
        blockchainName: 'Cardano' as const,
        windowId,
      },
    });

    const nonCardanoStartAction = {
      type: 'authorizeDapp/start' as const,
      payload: {
        dapp: mockDapp,
        blockchainName: 'Midnight' as const,
      },
    };

    const createTestDependencies = () => ({
      actions: {
        views: {
          setActiveSheetPage: vi.fn((p: unknown) => ({
            type: 'views/setActiveSheetPage',
            payload: p,
          })),
          openView: vi.fn((p: unknown) => ({
            type: 'views/openView',
            payload: p,
          })),
          closeView: vi.fn((id: unknown) => ({
            type: 'views/closeView',
            payload: id,
          })),
        },
        cardanoDappConnector: {
          setPendingAuthRequest: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/setPendingAuthRequest',
            payload: p,
          })),
          clearPendingAuthRequest: vi.fn(() => ({
            type: 'cardanoDappConnector/clearPendingAuthRequest',
          })),
          confirmAuth: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/confirmAuth',
            payload: p,
          })),
          setSessionAccountForOrigin: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/setSessionAccountForOrigin',
            payload: p,
          })),
        },
        authorizeDapp: {
          completed: vi.fn((p: unknown) => ({
            type: 'authorizeDapp/completed',
            payload: p,
          })),
        },
      } as unknown as ActionCreators,
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      },
    });

    it('filters non-Cardano blockchains', () => {
      testSideEffect(
        promptCardanoAuthorizeDapp,
        ({ hot, expectObservable }) => ({
          actionObservables: {
            authorizeDapp: {
              start$: hot('-a', { a: nonCardanoStartAction }),
              completed$: NEVER,
              failed$: NEVER,
            },
            cardanoDappConnector: {
              confirmConnect$: NEVER,
              rejectConnect$: NEVER,
            },
            views: {
              viewDisconnected$: NEVER,
              locationChanged$: NEVER,
            },
          },
          stateObservables: {
            views: { selectOpenViews$: hot('a', { a: [] }) },
          },
          dependencies: createTestDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });

    it('sheet mode: dispatches confirmAuth and completed on confirm', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: hot('- 200ms a', {
              a: {
                type: 'cardanoDappConnector/confirmConnect',
                payload: { account: mockAccount },
              },
            }),
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: mockAccount,
          });
          expect(
            deps.actions.cardanoDappConnector.setSessionAccountForOrigin,
          ).toHaveBeenCalledWith({
            origin: mockDapp.origin,
            accountId: mockAccount.accountId,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
        },
      }));
    });

    it('sheet mode: dispatches completed(false) on reject', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 200ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('sheet mode: dispatches completed(false) on panel closure', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: hot('- 200ms a', {
              a: {
                type: 'views/viewDisconnected',
                payload: sidePanelView.id,
              },
            }),
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('popup mode: dispatches confirmAuth and completed on confirm', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/confirmConnect',
                payload: { account: mockAccount },
              },
            }),
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c', {
              a: [],
              b: [],
              c: [popupView],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: mockAccount,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
        },
      }));
    });

    it('popup mode: dispatches completed(false) on reject', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c', {
              a: [],
              b: [],
              c: [popupView],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('popup mode: dispatches completed(false) on view closure', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: hot('- 300ms a', {
              a: {
                type: 'views/viewDisconnected',
                payload: popupView.id,
              },
            }),
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c 50ms d', {
              a: [],
              b: [],
              c: [popupView],
              d: [],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('debounces rapid requests', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-ab', {
              a: startAction(1),
              b: startAction(1),
            }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.setPendingAuthRequest,
          ).toHaveBeenCalledTimes(1);
        },
      }));
    });
  });

  describe('initializeSideEffects', () => {
    it('should return an array containing both extension side effects', () => {
      // initializeSideEffects doesn't use props or deps, so we can pass empty objects
      const sideEffects = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      expect(Array.isArray(sideEffects)).toBe(true);
      // connectCardanoDappConnectorApi: handles signTx/signData via handleRequests
      // promptCardanoAuthorizeDapp: handles enable() via authorizeDapp.start
      // resolveForeignTransactionInputs: resolves foreign inputs via Blockfrost
      // clearResolvedInputsOnSignTxClear: clears resolved inputs when signTx request is cleared
      // closeRequestedPopup: resolves closePopupRequested into views.closeView
      expect(sideEffects).toHaveLength(5);
      expect(sideEffects).toContain(connectCardanoDappConnectorApi);
      expect(sideEffects).toContain(promptCardanoAuthorizeDapp);
      expect(sideEffects).toContain(resolveForeignTransactionInputs);
      expect(sideEffects).toContain(clearResolvedInputsOnSignTxClear);
      expect(sideEffects).toContain(closeRequestedPopup);
    });

    it('should return the same side effect function references', () => {
      const sideEffects1 = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );
      const sideEffects2 = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      expect(sideEffects1[0]).toBe(sideEffects2[0]);
      expect(sideEffects1[1]).toBe(sideEffects2[1]);
    });

    it('should return side effects that match the SideEffect type', () => {
      const sideEffects = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      for (const sideEffect of sideEffects) {
        expect(typeof sideEffect).toBe('function');
        // Verify it has the expected function signature (3 parameters)
        expect(sideEffect.length).toBe(3);
      }
    });
  });
});
