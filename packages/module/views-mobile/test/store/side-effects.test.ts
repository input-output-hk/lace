import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { navigate } from '../../src/store/side-effects';

import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const actions = {
  ...viewsActions,
};

describe('views-mobile/store/side-effects', () => {
  describe('navigate', () => {
    it('dispatches a location change action', () => {
      testSideEffect(navigate, ({ hot, expectObservable }) => {
        const viewId = ViewId('test');
        const location = '/test';
        return {
          actionObservables: {
            views: {
              navigate$: hot('a', {
                a: actions.views.navigate(viewId, location),
              }),
            },
          },
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: (sideEffect$: Readonly<Observable<Action>>) => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.views.locationChanged({
                viewId,
                location,
              }),
            });
          },
        };
      });
    });
  });
});
