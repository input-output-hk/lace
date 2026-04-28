import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { connectDappConnectorApi } from '../../src/store/side-effects';
import { midnightDappConnectorActions } from '../../src/store/slice';

import type { ConfirmationRequest } from '../../src/store/dependencies/create-confirmation-callback';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type {
  LockStatus,
  MidnightWalletsByAccountId,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type { View, ViewType } from '@lace-contract/views';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const midnightAddress =
  '665e639d46357a66000984e09b42d9e5c93d25e5ac9313a00952325bd47afc61|0100016d89cc7d25bb084436829792112d895e6f0853521e01d6b59afcafe3761b162e';

const actions = {
  ...midnightDappConnectorActions,
  ...viewsActions,
  ...authenticationPromptActions,
};

const prepareState = ({
  activeWalletBlockchainName = 'Midnight',
}: { activeWalletBlockchainName?: BlockchainName } = {}) => {
  const networkId = NetworkId.NetworkId.Preview;
  const walletId = WalletId('id');
  const wallet = {
    walletId,
    accounts: [
      { blockchainName: activeWalletBlockchainName } as InMemoryWalletAccount,
    ],
  } as InMemoryWallet;

  return {
    networkId,
    wallet,
  };
};

// TODO: skipping tests until dapp connector is fully implemented and tested
describe.skip('connectDappConnectorApi', () => {
  const mockWallet = {
    accountId: 'mock-account-id',
    state$: of({
      balances: {
        '02000000000000000000000000000000000000000000000000000000000000000000':
          100n,
      },
      syncProgress: { synced: 100, total: 100 },
      address: midnightAddress,
    }),
    syncProgress$: of(1),
  } as unknown as MidnightWallet;
  const mockWalletMap: MidnightWalletsByAccountId = {
    [mockWallet.accountId]: mockWallet,
  };
  const authorizedDapps = {
    a: {} as AuthorizedDappsDataSlice,
  };
  const { wallet } = prepareState({
    activeWalletBlockchainName: 'Midnight',
  });

  describe('Prove transaction', () => {
    const proveTransactionRequest = {
      r: {
        resolve: vi.fn(),
        requestingDapp: {
          id: DappId('dapp1'),
          imageUrl: '',
          name: 'Test Dapp',
          origin: 'http://test-dapp.com',
        },
        type: 'proveTransaction',
      } as ConfirmationRequest,
    };
    const proveTransactionOpenedView = {
      u: [
        { id: ViewId('view1'), location: '/prove-midnight-transaction' },
      ] as View[],
    };

    it('opens dapp connector view, then requests password prompt when user confirms', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable, flush }) => {
          const selectOpenViews$ = cold('u', proveTransactionOpenedView);
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectAll$ = cold('a', { a: [wallet] });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallets$ = new BehaviorSubject(mockWalletMap);
          const authenticate = vi.fn().mockReturnValue(cold(''));
          const accessAuthSecret = vi.fn();

          const dependencies = {
            authenticate,
            accessAuthSecret,
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', proveTransactionRequest)),
            ),
            midnightWallets$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('-----a', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
            wallets: { selectAll$ },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/prove-midnight-transaction',
                }),
                b: actions.midnightDappConnector.setProveTxRequest({
                  dapp: proveTransactionRequest.r.requestingDapp,
                  transactionType:
                    proveTransactionRequest.r.transactionType ?? null,
                  transactionData:
                    proveTransactionRequest.r.transactionData ?? null,
                }),
              });

              flush();

              expect(
                dependencies.connectMidnightDappConnector,
              ).toHaveBeenCalledWith({
                wallets$: midnightWallets$,
                authorizedDapps$: selectAuthorizedDapps$,
                network$: selectCurrentNetwork$,
                handleRequests: expect.any(Function) as unknown,
              });

              expect(authenticate).toHaveBeenCalledWith(
                expect.objectContaining({
                  cancellable: true,
                }),
              );
            },
          };
        },
      );
    });

    it('opens dapp connector view, then closes it when user enters password', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable }) => {
          const selectOpenViews$ = cold('u', proveTransactionOpenedView);
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectAll$ = cold('a', { a: [wallet] });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallets$ = new BehaviorSubject(mockWalletMap);
          const authenticate = vi.fn().mockReturnValue(cold('a', { a: true }));
          const accessAuthSecret = vi.fn();

          const dependencies = {
            authenticate,
            accessAuthSecret,
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', proveTransactionRequest)),
            ),
            midnightWallets$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('-----a', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
            wallets: { selectAll$ },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)(cd)', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/prove-midnight-transaction',
                }),
                b: actions.midnightDappConnector.setProveTxRequest({
                  dapp: proveTransactionRequest.r.requestingDapp,
                  transactionType:
                    proveTransactionRequest.r.transactionType ?? null,
                  transactionData:
                    proveTransactionRequest.r.transactionData ?? null,
                }),
                c: actions.views.closeView(ViewId('view1')),
                d: actions.midnightDappConnector.setProveTxRequest(null),
              });

              expect(
                dependencies.connectMidnightDappConnector,
              ).toHaveBeenCalledWith({
                wallets$: midnightWallets$,
                authorizedDapps$: selectAuthorizedDapps$,
                network$: selectCurrentNetwork$,
                handleRequests: expect.any(Function) as unknown,
              });
            },
          };
        },
      );
    });

    it('opens dapp connector view, then closes it when user rejects', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable }) => {
          const selectOpenViews$ = cold('u', proveTransactionOpenedView);
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectAll$ = cold('a', { a: [wallet] });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallets$ = new BehaviorSubject(mockWalletMap);

          const dependencies = {
            authenticate: vi.fn(),
            accessAuthSecret: vi.fn(),
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', proveTransactionRequest)),
            ),
            midnightWallets$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('-----b', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
            wallets: { selectAll$ },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)(cd)', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/prove-midnight-transaction',
                }),
                b: actions.midnightDappConnector.setProveTxRequest({
                  dapp: proveTransactionRequest.r.requestingDapp,
                  transactionType:
                    proveTransactionRequest.r.transactionType ?? null,
                  transactionData:
                    proveTransactionRequest.r.transactionData ?? null,
                }),
                c: actions.views.closeView(ViewId('view1')),
                d: actions.midnightDappConnector.setProveTxRequest(null),
              });

              expect(
                dependencies.connectMidnightDappConnector,
              ).toHaveBeenCalledWith({
                wallets$: midnightWallets$,
                authorizedDapps$: selectAuthorizedDapps$,
                network$: selectCurrentNetwork$,
                handleRequests: expect.any(Function) as unknown,
              });
            },
          };
        },
      );
    });

    it('rejects tx confirmation request when dapp connector view is closed', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable, flush }) => {
          const selectOpenViews$ = cold('---uv', {
            ...proveTransactionOpenedView,
            v: [],
          });
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const selectAll$ = cold('a', { a: [wallet] });
          const midnightWallets$ = new BehaviorSubject(mockWalletMap);
          const accessAuthSecret = vi.fn();

          const dependencies = {
            authenticate: vi.fn(),
            accessAuthSecret,
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', proveTransactionRequest)),
            ),
            midnightWallets$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
            wallets: { selectAll$ },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)---c', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/prove-midnight-transaction',
                }),
                b: actions.midnightDappConnector.setProveTxRequest({
                  dapp: proveTransactionRequest.r.requestingDapp,
                  transactionType:
                    proveTransactionRequest.r.transactionType ?? null,
                  transactionData:
                    proveTransactionRequest.r.transactionData ?? null,
                }),
                c: actions.midnightDappConnector.setProveTxRequest(null),
              });

              flush();
              expect(proveTransactionRequest.r.resolve).toHaveBeenCalledWith({
                isConfirmed: false,
                accessAuthSecret: expect.any(Function) as unknown,
              });
            },
          };
        },
      );
    });
  });

  describe('Sign data', () => {
    const signDataRequest = {
      r: {
        resolve: vi.fn(),
        requestingDapp: {
          id: DappId('dapp1'),
          imageUrl: '',
          name: 'Test Dapp',
          origin: 'http://test-dapp.com',
        },
        type: 'signData',
        signDataPayload: '48656c6c6f',
        signDataKeyType: 'unshielded',
      } as ConfirmationRequest,
    };
    const signDataOpenedView = {
      u: [{ id: ViewId('view1'), location: '/sign-midnight-data' }] as View[],
    };

    it('opens dapp connector view, then requests password prompt when user confirms', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable, flush }) => {
          const selectOpenViews$ = cold('u', signDataOpenedView);
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallet$ = new BehaviorSubject(mockWallet);
          const authenticateenticationPrompt = vi
            .fn()
            .mockReturnValue(cold(''));

          const dependencies = {
            authPrompt: () => ({
              authenticateenticationPrompt,
              authSecretAccessor: {
                accessAuthSecret: vi.fn(),
                cleanupLocalAuthSecretCopy: vi.fn(),
                destroyAccessor: vi.fn(),
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              authenticationPrompt$: cold<any>(''),
            }),
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', signDataRequest)),
            ),
            midnightWallet$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('-----a', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/sign-midnight-data',
                }),
                b: actions.midnightDappConnector.setSignDataRequest({
                  dapp: signDataRequest.r.requestingDapp,
                  payload: '48656c6c6f',
                  keyType: 'unshielded',
                }),
              });

              flush();

              expect(authenticateenticationPrompt).toHaveBeenCalledWith(
                expect.objectContaining({
                  cancellable: true,
                }),
              );
            },
          };
        },
      );
    });

    it('opens dapp connector view, then closes it when user rejects', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable }) => {
          const selectOpenViews$ = cold('u', signDataOpenedView);
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallet$ = new BehaviorSubject(mockWallet);

          const dependencies = {
            authPrompt: () => ({
              authenticateenticationPrompt: vi.fn(),
              authSecretAccessor: {
                accessAuthSecret: vi.fn(),
                cleanupLocalAuthSecretCopy: vi.fn(),
                destroyAccessor: vi.fn(),
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              authenticationPrompt$: cold<any>(''),
            }),
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', signDataRequest)),
            ),
            midnightWallet$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('-----b', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)(cd)', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/sign-midnight-data',
                }),
                b: actions.midnightDappConnector.setSignDataRequest({
                  dapp: signDataRequest.r.requestingDapp,
                  payload: '48656c6c6f',
                  keyType: 'unshielded',
                }),
                c: actions.views.closeView(ViewId('view1')),
                d: actions.midnightDappConnector.setSignDataRequest(null),
              });
            },
          };
        },
      );
    });

    it('rejects sign data request when dapp connector view is closed', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable, flush }) => {
          const selectOpenViews$ = cold('---uv', {
            ...signDataOpenedView,
            v: [],
          });
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectLockedStatus$ = cold('a', {
            a: 'unlocked' as LockStatus,
          });
          const midnightWallet$ = new BehaviorSubject(mockWallet);
          const accessAuthSecret = vi.fn();

          const dependencies = {
            authPrompt: () => ({
              authenticateenticationPrompt: vi.fn(),
              authSecretAccessor: {
                accessAuthSecret,
                cleanupLocalAuthSecretCopy: vi.fn(),
                destroyAccessor: vi.fn(),
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              authenticationPrompt$: cold<any>(''),
            }),
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', signDataRequest)),
            ),
            midnightWallet$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-(ab)---c', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/sign-midnight-data',
                }),
                b: actions.midnightDappConnector.setSignDataRequest({
                  dapp: signDataRequest.r.requestingDapp,
                  payload: '48656c6c6f',
                  keyType: 'unshielded',
                }),
                c: actions.midnightDappConnector.setSignDataRequest(null),
              });

              flush();
              expect(signDataRequest.r.resolve).toHaveBeenCalledWith({
                isConfirmed: false,
                accessAuthSecret,
              });
            },
          };
        },
      );
    });
  });

  describe('Unlock wallet', () => {
    const unlockWalletRequest = {
      r: {
        resolve: vi.fn(),
        requestingDapp: {
          id: DappId('dapp1'),
          imageUrl: '',
          name: 'Test Dapp',
          origin: 'http://test-dapp.com',
        },
        type: 'unlockWallet',
      } as ConfirmationRequest,
    };

    it('opens popup view with midnight-wallet-unlock location when the wallet is locked and closes view when unlocked', () => {
      testSideEffect(
        connectDappConnectorApi,
        ({ cold, hot, expectObservable }) => {
          const selectOpenViews$ = cold('u-v', {
            u: [],
            v: [
              {
                id: ViewId('view1'),
                location: '/midnight-wallet-unlock',
                type: 'popupWindow' as ViewType,
              },
            ],
          });
          const selectAuthorizedDapps$ = cold('a', authorizedDapps);
          const selectCurrentNetwork$ = cold('a', {
            a: {
              networkId: NetworkId.NetworkId.Preview,
              config: {
                nodeAddress: 'http://localhost:8080',
                proofServerAddress: 'http://localhost:8081',
                indexerAddress: 'http://localhost:8082',
              },
            },
          });
          const selectAll$ = cold('a', { a: [wallet] });
          const selectLockedStatus$ = cold('(ab)', {
            a: 'locked' as LockStatus,
            b: 'unlocked' as LockStatus,
          });
          const midnightWallets$ = new BehaviorSubject(mockWalletMap);

          const dependencies = {
            connectMidnightDappConnector: vi.fn(({ handleRequests }) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
              handleRequests(cold('-r', unlockWalletRequest)),
            ),
            midnightWallets$,
            actions,
          };

          const actionObservables = {
            midnightDappConnector: {
              confirmDappTx$: hot('----', {
                a: actions.midnightDappConnector.confirmDappTx(),
              }),
              rejectDappTx$: hot('----', {
                b: actions.midnightDappConnector.rejectDappTx(),
              }),
              confirmSignData$: hot('----', {
                a: actions.midnightDappConnector.confirmSignData(),
              }),
              rejectSignData$: hot('----', {
                b: actions.midnightDappConnector.rejectSignData(),
              }),
            },
          };

          const stateObservables = {
            views: { selectOpenViews$ },
            dappConnector: { selectAuthorizedDapps$ },
            midnightContext: {
              selectLockedStatus$,
              selectCurrentNetwork$,
            },
            wallets: { selectAll$ },
          };

          return {
            dependencies,
            actionObservables,
            stateObservables,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-a-b', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/midnight-wallet-unlock',
                }),
                b: actions.views.closeView(ViewId('view1')),
              });
            },
          };
        },
      );
    });
  });
});
