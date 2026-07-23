import { DappId, dappConnectorActions } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, vi, it } from 'vitest';

import { promptMidnightAuthorizeDapp } from '../../src/store/authorize-dapp-util';
import { midnightDappConnectorActions } from '../../src/store/slice';

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
  'midnightDappConnector/confirmConnect'
>;

const actions = {
  ...midnightDappConnectorActions,
  ...viewsActions,
  ...dappConnectorActions,
};

describe('promptMidnightAuthorizeDapp', () => {
  const dapp: Dapp = {
    id: DappId('dappId'),
    imageUrl: 'imageUrl',
    name: 'dappName',
    origin: 'dappOrigin',
  };

  const MIDNIGHT_AUTHORIZE_DAPP_LOCATION = '/midnight-authorize-dapp';
  const viewId = ViewId('viewId');

  const startAction: StartAction = {
    payload: { blockchainName: 'Midnight', dapp },
    type: 'authorizeDapp/start',
  };

  const viewConnectedValue: ViewConnectedAction = {
    payload: {
      id: viewId,
      location: MIDNIGHT_AUTHORIZE_DAPP_LOCATION,
      type: 'popupWindow',
    },
    type: 'views/viewConnected',
  };

  const openViewExpected = actions.views.openView({
    type: 'popupWindow',
    location: MIDNIGHT_AUTHORIZE_DAPP_LOCATION,
  });

  const completedUnauthorizedExpected = actions.authorizeDapp.completed({
    authorized: false,
    dapp,
  });

  const testAccount = {
    accountId: 'midnight-account-0',
    blockchainName: 'Midnight',
    walletId: 'wallet-0',
    metadata: { name: 'Midnight 0' },
  } as unknown as AnyAccount;

  const confirmConnectValue: ConfirmConnectAction = {
    payload: { account: testAccount, dappId: dapp.id },
    type: 'midnightDappConnector/confirmConnect',
  };

  const setSessionAccountExpected =
    actions.midnightDappConnector.setSessionAccountForOrigin({
      origin: dapp.origin,
      accountId: testAccount.accountId,
    });

  const completedAuthorizedExpected = actions.authorizeDapp.completed({
    authorized: true,
    dapp,
    blockchainName: 'Midnight',
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
    } = {},
  ) => ({
    dappConnector: {
      selectAuthorizedDapps$: helpers.hot('a', {
        a: overrides.authorizedDapps ?? {},
      }),
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
    } = {},
  ) => ({
    authorizeDapp: {
      start$: helpers.hot<StartAction>('-a', { a: startAction }),
      completed$:
        overrides.authorizeDappCompleted$ ?? helpers.hot<CompletedAction>(''),
      failed$: overrides.authorizeDappFailed$ ?? helpers.hot<FailedAction>(''),
    },
    midnightDappConnector: {
      confirmConnect$:
        overrides.confirmConnect$ ?? helpers.hot<ConfirmConnectAction>(''),
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

  it('opens authorize dapp view when authorizeDapp.start$ emits for Midnight', () => {
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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

  it('binds the selected account and completes authorized when confirmConnect emits', () => {
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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

  it('binds the account when confirm races a simultaneous popup close', () => {
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        viewConnected$: helpers.cold<ViewConnectedAction>('---b', {
          b: viewConnectedValue,
        }),
        confirmConnect$: helpers.cold<ConfirmConnectAction>('-----c', {
          c: confirmConnectValue,
        }),
        viewDisconnected$: helpers.cold<ViewDisconnectedAction>('-----d', {
          d: { payload: viewId, type: 'views/viewDisconnected' },
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

  it('ignores a confirmConnect emitted for a different dapp', () => {
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers, {
        confirmConnect$: helpers.cold<ConfirmConnectAction>('---c', {
          c: {
            payload: { account: testAccount, dappId: DappId('other-dapp') },
            type: 'midnightDappConnector/confirmConnect',
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
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
      dependencies: makeDependencies(),
      actionObservables: buildActionObservables(helpers),
      stateObservables: buildStateObservables(helpers, {
        authorizedDapps: { Midnight: [{ dapp: { origin: dapp.origin } }] },
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

  it('completes with authorized: false when view disconnects', () => {
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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
    testSideEffect(promptMidnightAuthorizeDapp, helpers => ({
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
});
