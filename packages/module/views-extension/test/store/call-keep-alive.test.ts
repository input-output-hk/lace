import { createTestScheduler } from '@cardano-sdk/util-dev';
import { ViewId } from '@lace-contract/module';
import { viewsActions as actions } from '@lace-contract/views';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, it } from 'vitest';

import {
  KEEP_ALIVE_INTERVAL,
  callKeepAlive,
} from '../../src/store/call-keep-alive';

import type { ActionCreators } from '../../src';
import type {
  ConnectedView,
  ObservableExtensionViewApi,
} from '../../src/store/dependencies';
import type { ActionObservables } from '@lace-contract/module';

const createStubApi = (keepAliveResult: string) =>
  ({
    keepAlive: () => of(keepAliveResult as unknown as undefined),
  } as ObservableExtensionViewApi);

const createConnectedView = (view: string): ConnectedView => ({
  view: { id: view } as ConnectedView['view'],
  api: createStubApi(view),
});

describe('callKeepAlive', () => {
  it('emits first available api every KEEP_ALIVE_INTERVAL, re-setting the timer on every connection', () => {
    createTestScheduler().run(({ hot, expectObservable }): void => {
      const viewConnect$ = hot<ConnectedView>(
        `a ${KEEP_ALIVE_INTERVAL + KEEP_ALIVE_INTERVAL * 0.5}ms b`,
        {
          a: createConnectedView('a'),
          b: createConnectedView('b'),
        },
      );
      const actionObservables = {
        views: {
          closeView$: hot(''),
        },
      } as unknown as ActionObservables<ActionCreators>;
      expectObservable(
        callKeepAlive(actionObservables, viewConnect$, dummyLogger),
        `^ ${KEEP_ALIVE_INTERVAL * 4}ms !`,
      ).toBe(
        // emits 'a' after 1st interval duration;
        // 'b' connection happens at interval+interval*0.5, which debounces the 2nd emission by 0.5
        // 3rd emission happens as after an interval duration again
        //
        // in this scenario 2 views are connected; it always emits 1st api ('a')
        // for the purpose of keeping SW alive, it does not matter which view api to call
        // prettier-ignore
        `${KEEP_ALIVE_INTERVAL}ms a ${KEEP_ALIVE_INTERVAL + KEEP_ALIVE_INTERVAL * 0.5}ms a ${KEEP_ALIVE_INTERVAL - 1}ms a`,
        { a: 'a' },
      );
    });
  });

  it('does not emit if disconnected sooner than KEEP_ALIVE_INTERVAL', () => {
    createTestScheduler().run(({ hot, expectObservable }): void => {
      const viewConnect$ = hot<ConnectedView>(`a ${KEEP_ALIVE_INTERVAL}ms b`, {
        a: createConnectedView('a'),
        b: createConnectedView('b'),
      });

      const actionObservables = {
        views: {
          closeView$: hot('-a', { a: actions.views.closeView(ViewId('a')) }),
        },
      } as unknown as ActionObservables<ActionCreators>;
      expectObservable(
        callKeepAlive(actionObservables, viewConnect$, dummyLogger),
        `^ ${KEEP_ALIVE_INTERVAL * 2.5}ms !`,
      ).toBe(
        // does not emit 'a' because it's disconnected in next frame after connection
        `- ${KEEP_ALIVE_INTERVAL * 2}ms b`,
        { b: 'b' },
      );
    });
  });
});
