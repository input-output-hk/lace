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

  const buildActionObservables = (
    helpers: Readonly<RunHelpers>,
    overrides: {
      viewConnected$?: Observable<ViewConnectedAction>;
      viewDisconnected$?: Observable<ViewDisconnectedAction>;
      locationChanged$?: Observable<LocationChangedAction>;
      authorizeDappCompleted$?: Observable<CompletedAction>;
      authorizeDappFailed$?: Observable<FailedAction>;
    } = {},
  ) => ({
    authorizeDapp: {
      start$: helpers.hot<StartAction>('-a', { a: startAction }),
      completed$:
        overrides.authorizeDappCompleted$ ?? helpers.hot<CompletedAction>(''),
      failed$: overrides.authorizeDappFailed$ ?? helpers.hot<FailedAction>(''),
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
      stateObservables: {},
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
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
      stateObservables: {},
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
      stateObservables: {},
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
      stateObservables: {},
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
      stateObservables: {},
      assertion: sideEffect$ => {
        helpers.expectObservable(sideEffect$).toBe('- 100ms a', {
          a: openViewExpected,
        });
      },
    }));
  });
});
