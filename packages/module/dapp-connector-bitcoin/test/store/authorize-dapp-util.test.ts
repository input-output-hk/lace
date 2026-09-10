import { DappId, dappConnectorActions } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { promptBitcoinAuthorizeDapp } from '../../src/store/authorize-dapp-util';
import { bitcoinDappConnectorActions } from '../../src/store/slice';

import type {
  AuthorizedDappCompleted,
  AuthorizeDappFailed,
  AuthorizeDappRequest,
  Dapp,
} from '@lace-contract/dapp-connector';
import type { View } from '@lace-contract/views';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

type Action<P, T extends string> = { payload: P; type: T };
type StartAction = Action<AuthorizeDappRequest, 'authorizeDapp/start'>;
type ViewConnectedAction = Action<View, 'views/viewConnected'>;
type ViewDisconnectedAction = Action<ViewId, 'views/viewDisconnected'>;
type LocationChangedAction = Action<
  { viewId: ViewId; location: string },
  'views/locationChanged'
>;
type CompletedAction = Action<
  AuthorizedDappCompleted,
  'authorizeDapp/completed'
>;
type FailedAction = Action<AuthorizeDappFailed, 'authorizeDapp/failed'>;
type ConfirmConnectAction = Action<
  { account: AnyAccount; dappId: DappId },
  'bitcoinDappConnector/confirmConnect'
>;
type RejectConnectAction = Action<
  undefined,
  'bitcoinDappConnector/rejectConnect'
>;

(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

const actions = {
  ...bitcoinDappConnectorActions,
  ...viewsActions,
  ...dappConnectorActions,
};

describe('promptBitcoinAuthorizeDapp', () => {
  const dapp: Dapp = {
    id: DappId('dappId'),
    imageUrl: 'imageUrl',
    name: 'dappName',
    origin: 'dappOrigin',
  };

  const BITCOIN_DAPP_CONNECT_LOCATION = '/bitcoin-dapp-connect';
  const viewId = ViewId('viewId');

  const startAction: StartAction = {
    payload: { blockchainName: 'Bitcoin', dapp },
    type: 'authorizeDapp/start',
  };

  const viewConnectedValue: ViewConnectedAction = {
    payload: {
      id: viewId,
      location: BITCOIN_DAPP_CONNECT_LOCATION,
      type: 'popupWindow',
    },
    type: 'views/viewConnected',
  };

  const openViewExpected = actions.views.openView({
    type: 'popupWindow',
    location: BITCOIN_DAPP_CONNECT_LOCATION,
  });

  const completedUnauthorizedExpected = actions.authorizeDapp.completed({
    authorized: false,
    dapp,
  });

  const testAccount = {
    accountId: 'bitcoin-account-0',
    blockchainName: 'Bitcoin',
    walletId: 'wallet-0',
    metadata: { name: 'Bitcoin 0' },
  } as unknown as AnyAccount;

  const confirmConnectValue: ConfirmConnectAction = {
    payload: { account: testAccount, dappId: dapp.id },
    type: 'bitcoinDappConnector/confirmConnect',
  };

  const setSessionAccountExpected =
    actions.bitcoinDappConnector.setSessionAccountForOrigin({
      origin: dapp.origin,
      accountId: testAccount.accountId,
    });

  const completedAuthorizedExpected = actions.authorizeDapp.completed({
    authorized: true,
    dapp,
    blockchainName: 'Bitcoin',
  });

  const makeDependencies = () => ({
    logger: {
      info: vi.fn(),
      trace: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    actions,
  });

  const buildStateObservables = (
    helpers: Readonly<RunHelpers>,
    overrides: {
      authorizedDapps?: Record<string, Array<{ dapp: { origin: string } }>>;
      accounts?: AnyAccount[];
      wallets?: AnyWallet[];
      openViews?: View[];
    } = {},
  ) => ({
    dappConnector: {
      selectAuthorizedDapps$: helpers.hot('a', {
        a: overrides.authorizedDapps ?? {},
      }),
    },
    views: {
      selectOpenViews$: of(overrides.openViews ?? []),
    },
    wallets: {
      selectActiveNetworkAccounts$: helpers.hot<AnyAccount[]>('a', {
        a: overrides.accounts ?? [],
      }),
      selectAll$: helpers.hot<AnyWallet[]>('a', {
        a: overrides.wallets ?? [],
      }),
    },
  });

  const buildActionObservables = (
    helpers: Readonly<RunHelpers>,
    overrides: {
      viewConnected$?: Observable<ViewConnectedAction>;
      viewDisconnected$?: Observable<ViewDisconnectedAction>;
      locationChanged$?: Observable<LocationChangedAction>;
      authorizeDappCompleted$?: Observable<CompletedAction>;
      authorizeDappFailed$?: Observable<FailedAction>;
      confirmConnect$?: Observable<ConfirmConnectAction>;
      rejectConnect$?: Observable<RejectConnectAction>;
    } = {},
  ) => ({
    authorizeDapp: {
      start$: helpers.hot<StartAction>('-a', { a: startAction }),
      completed$:
        overrides.authorizeDappCompleted$ ?? helpers.hot<CompletedAction>(''),
      failed$: overrides.authorizeDappFailed$ ?? helpers.hot<FailedAction>(''),
    },
    bitcoinDappConnector: {
      confirmConnect$:
        overrides.confirmConnect$ ?? helpers.hot<ConfirmConnectAction>(''),
      rejectConnect$:
        overrides.rejectConnect$ ?? helpers.hot<RejectConnectAction>(''),
    },
    views: {
      viewConnected$:
        overrides.viewConnected$ ?? helpers.hot<ViewConnectedAction>(''),
      viewDisconnected$:
        overrides.viewDisconnected$ ?? helpers.hot<ViewDisconnectedAction>(''),
      locationChanged$:
        overrides.locationChanged$ ?? helpers.hot<LocationChangedAction>(''),
    },
  });

  it('opens the connect view when authorizeDapp.start$ emits for Bitcoin', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  it('ignores authorizeDapp.start$ emitted for another blockchain', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: {
        ...buildActionObservables(helpers),
        authorizeDapp: {
          start$: helpers.hot<StartAction>('-a', {
            a: {
              payload: { blockchainName: 'Midnight', dapp },
              type: 'authorizeDapp/start',
            },
          }),
          completed$: helpers.hot<CompletedAction>(''),
          failed$: helpers.hot<FailedAction>(''),
        },
      },
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('');
      },
    }));
  });

  it('binds the selected account and completes authorized when confirmConnect emits', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        confirmConnect$: helpers.cold<ConfirmConnectAction>('-----c', {
          c: confirmConnectValue,
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 4ms (bc)', {
          a: openViewExpected,
          b: setSessionAccountExpected,
          c: completedAuthorizedExpected,
        });
      },
    }));
  });

  it('completes authorized when confirmConnect emits before the view connects', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        confirmConnect$: helpers.cold<ConfirmConnectAction>('---c', {
          c: confirmConnectValue,
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms (bc)', {
          a: openViewExpected,
          b: setSessionAccountExpected,
          c: completedAuthorizedExpected,
        });
      },
    }));
  });

  it('binds the account from the start payload origin, not the confirm action', () => {
    const confirmForForeignAccount: ConfirmConnectAction = {
      payload: {
        account: {
          accountId: 'bitcoin-account-1',
          blockchainName: 'Bitcoin',
          walletId: 'wallet-0',
          metadata: { name: 'Bitcoin 1' },
        } as unknown as AnyAccount,
        dappId: dapp.id,
      },
      type: 'bitcoinDappConnector/confirmConnect',
    };

    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        confirmConnect$: helpers.cold<ConfirmConnectAction>('---c', {
          c: confirmForForeignAccount,
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms (bc)', {
          a: openViewExpected,
          b: actions.bitcoinDappConnector.setSessionAccountForOrigin({
            origin: dapp.origin,
            accountId: confirmForForeignAccount.payload.account.accountId,
          }),
          c: completedAuthorizedExpected,
        });
      },
    }));
  });

  it('ignores a confirmConnect emitted for a different dapp', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        confirmConnect$: helpers.cold<ConfirmConnectAction>('---c', {
          c: {
            payload: { account: testAccount, dappId: DappId('other-dapp') },
            type: 'bitcoinDappConnector/confirmConnect',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  it('auto-grants without a picker for a persisted single-account wallet', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers),
      stateObservables: buildStateObservables(helpers, {
        authorizedDapps: { Bitcoin: [{ dapp: { origin: dapp.origin } }] },
        accounts: [testAccount],
        wallets: [{ walletId: 'wallet-0' } as unknown as AnyWallet],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms (ab)', {
          a: setSessionAccountExpected,
          b: completedAuthorizedExpected,
        });
      },
    }));
  });

  it('prompts instead of auto-granting when more than one Bitcoin account exists', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers),
      stateObservables: buildStateObservables(helpers, {
        authorizedDapps: { Bitcoin: [{ dapp: { origin: dapp.origin } }] },
        accounts: [
          testAccount,
          {
            accountId: 'bitcoin-account-1',
            blockchainName: 'Bitcoin',
            walletId: 'wallet-0',
            metadata: { name: 'Bitcoin 1' },
          } as unknown as AnyAccount,
        ],
        wallets: [{ walletId: 'wallet-0' } as unknown as AnyWallet],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  it('completes with authorized: false when view disconnects', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        viewDisconnected$: helpers.cold<ViewDisconnectedAction>('-----c', {
          c: { payload: viewId, type: 'views/viewDisconnected' },
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 7ms b', {
          a: openViewExpected,
          b: completedUnauthorizedExpected,
        });
      },
    }));
  });

  it('completes with authorized: false when location changes', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        locationChanged$: helpers.cold<LocationChangedAction>('-----c', {
          c: {
            payload: { viewId, location: 'other-location' },
            type: 'views/locationChanged',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 7ms b', {
          a: openViewExpected,
          b: completedUnauthorizedExpected,
        });
      },
    }));
  });

  it('stops listening when authorizeDapp.completed$ emits', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        viewDisconnected$: helpers.cold<ViewDisconnectedAction>('-------c', {
          c: { payload: viewId, type: 'views/viewDisconnected' },
        }),
        authorizeDappCompleted$: helpers.hot<CompletedAction>('- 100ms ----d', {
          d: {
            payload: { authorized: false, dapp },
            type: 'authorizeDapp/completed',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  it('stops listening when authorizeDapp.failed$ emits', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        viewDisconnected$: helpers.cold<ViewDisconnectedAction>('-------c', {
          c: { payload: viewId, type: 'views/viewDisconnected' },
        }),
        authorizeDappFailed$: helpers.hot<FailedAction>('- 100ms ----d', {
          d: {
            payload: { dapp, reason: 'reason' },
            type: 'authorizeDapp/failed',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  it('closes the connect popup when the request is dropped', () => {
    const popupView = {
      id: viewId,
      location: BITCOIN_DAPP_CONNECT_LOCATION,
      type: 'popupWindow',
    } as unknown as View;

    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        authorizeDappFailed$: helpers.hot<FailedAction>('- 100ms ----d', {
          d: {
            payload: { dapp, reason: 'reason' },
            type: 'authorizeDapp/failed',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers, {
        openViews: [popupView],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 3ms b', {
          a: openViewExpected,
          b: actions.views.closeView(viewId),
        });
      },
    }));
  });

  it('supersedes a prompt that can no longer resolve with a fresh enable', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: {
        ...buildActionObservables(helpers),
        authorizeDapp: {
          ...buildActionObservables(helpers).authorizeDapp,
          start$: helpers.hot<StartAction>('-a 200ms a', { a: startAction }),
        },
      },
      stateObservables: buildStateObservables(helpers),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 200ms a', {
          a: openViewExpected,
        });
      },
    }));
  });

  const sidePanelViewId = ViewId('sidePanelViewId');
  const sidePanel = {
    id: sidePanelViewId,
    location: '/',
    type: 'sidePanel',
    windowId: 7,
  } as unknown as View;

  const startActionInWindow: StartAction = {
    payload: { blockchainName: 'Bitcoin', dapp, windowId: 7 },
    type: 'authorizeDapp/start',
  };

  const setActiveSheetExpected = actions.views.setActiveSheetPage({
    route: 'BitcoinDappConnect',
    params: {
      dapp: {
        icon: { type: 'uri', uri: dapp.imageUrl },
        name: dapp.name,
        category: '',
      },
      dappOrigin: dapp.origin,
    },
    targetViewId: sidePanelViewId,
  });

  const clearActiveSheetExpected = actions.views.setActiveSheetPage(null);

  const sheetActionObservables = (
    helpers: Readonly<RunHelpers>,
    overrides: Parameters<typeof buildActionObservables>[1] = {},
  ) => ({
    ...buildActionObservables(helpers, overrides),
    authorizeDapp: {
      ...buildActionObservables(helpers, overrides).authorizeDapp,
      start$: helpers.hot<StartAction>('-a', { a: startActionInWindow }),
    },
  });

  it('opens the review in the side panel sheet when Lace is open in the requesting window', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: sheetActionObservables(helpers),
      stateObservables: buildStateObservables(helpers, {
        openViews: [sidePanel],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: setActiveSheetExpected,
        });
      },
    }));
  });

  it('binds the account and dismisses the sheet when confirmConnect emits', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: sheetActionObservables(helpers, {
        confirmConnect$: helpers.cold<ConfirmConnectAction>('---b', {
          b: confirmConnectValue,
        }),
      }),
      stateObservables: buildStateObservables(helpers, {
        openViews: [sidePanel],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms (bcd)', {
          a: setActiveSheetExpected,
          b: clearActiveSheetExpected,
          c: setSessionAccountExpected,
          d: completedAuthorizedExpected,
        });
      },
    }));
  });

  it('completes unauthorized and dismisses the sheet when the side panel closes', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: sheetActionObservables(helpers, {
        viewDisconnected$: helpers.cold<ViewDisconnectedAction>('---b', {
          b: { payload: sidePanelViewId, type: 'views/viewDisconnected' },
        }),
      }),
      stateObservables: buildStateObservables(helpers, {
        openViews: [sidePanel],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms (bc)', {
          a: setActiveSheetExpected,
          b: clearActiveSheetExpected,
          c: completedUnauthorizedExpected,
        });
      },
    }));
  });

  it('dismisses the sheet without authorizing when the request is dropped', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: sheetActionObservables(helpers, {
        authorizeDappFailed$: helpers.hot<FailedAction>('- 100ms ---d', {
          d: {
            payload: { dapp, reason: 'reason' },
            type: 'authorizeDapp/failed',
          },
        }),
      }),
      stateObservables: buildStateObservables(helpers, {
        openViews: [sidePanel],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms b', {
          a: setActiveSheetExpected,
          b: clearActiveSheetExpected,
        });
      },
    }));
  });

  it('completes unauthorized and dismisses the sheet when rejectConnect emits', () => {
    testSideEffect(promptBitcoinAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: sheetActionObservables(helpers, {
        rejectConnect$: helpers.cold<RejectConnectAction>('---b', {
          b: { payload: undefined, type: 'bitcoinDappConnector/rejectConnect' },
        }),
      }),
      stateObservables: buildStateObservables(helpers, {
        openViews: [sidePanel],
      }),
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a 2ms (bc)', {
          a: setActiveSheetExpected,
          b: clearActiveSheetExpected,
          c: completedUnauthorizedExpected,
        });
      },
    }));
  });
});
