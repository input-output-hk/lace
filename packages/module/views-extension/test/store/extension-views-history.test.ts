import { createTestScheduler } from '@cardano-sdk/util-dev';
import { ViewId } from '@lace-contract/module';
import { NEVER, Subject, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createExtensionViewsHistory } from '../../src/store/extension-views-history';

import type {
  ConnectedView,
  ObservableExtensionViewApi,
} from '../../src/store/dependencies';
import type {
  LocationChangedPayload,
  View,
  ViewsHistory,
} from '@lace-contract/views';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

describe('views-extension/extension-views-history', () => {
  const view: View = {
    id: ViewId('some-view'),
    location: '/some-location',
    type: 'sidePanel',
  };

  describe('call', () => {
    let viewConnect$: Subject<ConnectedView>;
    let viewDisconnect$: Subject<ViewId>;
    let viewsHistory: ViewsHistory;
    let extensionViewApi: ObservableExtensionViewApi;

    beforeEach(() => {
      viewConnect$ = new Subject();
      viewDisconnect$ = new Subject();
      viewsHistory = createExtensionViewsHistory(
        { viewConnect$, viewDisconnect$ },
        dummyLogger,
      );
      extensionViewApi = {
        callHistoryMethod: vi.fn().mockReturnValue(of()),
        keepAlive: vi.fn(),
        close: vi.fn(),
        locationChanged$: NEVER,
      };
      viewConnect$.next({
        view,
        api: extensionViewApi,
      });
    });

    it('calls history method on ExtensionViewApi', () => {
      viewsHistory.call({
        viewId: view.id,
        args: ['/new-location'],
        method: 'push',
      });
      expect(extensionViewApi.callHistoryMethod).toHaveBeenCalledWith({
        args: [{ hash: '/new-location' }],
        method: 'push',
      });
    });

    it('sets location to empty string when navigating to root url', () => {
      viewsHistory.call({
        viewId: view.id,
        args: ['/'],
        method: 'push',
      });
      expect(extensionViewApi.callHistoryMethod).toHaveBeenCalledWith({
        args: [{ hash: '' }],
        method: 'push',
      });
    });
  });

  describe('locationChanged$', () => {
    type LocationChangedTest = {
      assertion: (
        locationChanged$: Readonly<Observable<LocationChangedPayload>>,
      ) => void;
      viewConnect$: Observable<ConnectedView>;
      viewDisconnect$: Observable<ViewId>;
    };

    const testLocationChanged = (
      setup: (helpers: Readonly<RunHelpers>) => LocationChangedTest,
    ) => {
      createTestScheduler().run((helpers): void => {
        const { viewConnect$, viewDisconnect$, assertion } = setup(helpers);
        assertion(
          createExtensionViewsHistory(
            {
              viewConnect$,
              viewDisconnect$,
            },
            dummyLogger,
          ).locationChanged$,
        );
      });
    };

    it('emits when ExtensionViewApi emits a new location', () => {
      testLocationChanged(({ hot, expectObservable }) => ({
        viewConnect$: hot('a', {
          a: {
            view,
            api: {
              locationChanged$: hot('abc', {
                a: view.location,
                b: '/new-location',
                c: '/new-location',
              }),
              keepAlive: vi.fn(),
              close: vi.fn(),
              callHistoryMethod: vi.fn(),
            },
          },
        }),
        viewDisconnect$: hot('--'),
        assertion: locationChanged$ => {
          expectObservable(locationChanged$).toBe('-bc', {
            b: {
              viewId: view.id,
              location: '/new-location',
            } as LocationChangedPayload,
            c: {
              viewId: view.id,
              location: '/new-location',
            } as LocationChangedPayload,
          });
        },
      }));
    });
  });
});
