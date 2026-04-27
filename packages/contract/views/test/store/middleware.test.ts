import { ViewId } from '@lace-contract/module';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRouterMiddleware, viewsActions as actions } from '../../src';

import type { LocationChangedPayload } from '../../src';
import type { Mock } from 'vitest';

describe('views/middleware', () => {
  describe('createRouterMiddleware', () => {
    const viewId = ViewId('view-id');
    let locationChanged$: Subject<LocationChangedPayload>;
    let dispatch: Mock;
    let getState: Mock;
    let call: Mock;

    beforeEach(() => {
      locationChanged$ = new Subject<LocationChangedPayload>();
      dispatch = vi.fn();
      getState = vi.fn();
      call = vi.fn();
    });

    it('dispatches "locationChanged" action when viewsHistory.locationChanged$ emits', () => {
      createRouterMiddleware({
        locationChanged$,
        call,
      })({ dispatch, getState });
      const locationChangedPayload = {
        viewId,
        location: '/new-location',
      };

      locationChanged$.next(locationChangedPayload);
      expect(dispatch).toHaveBeenCalledWith(
        actions.views.locationChanged(locationChangedPayload),
      );
    });

    it('calls "viewsHistory.call" when "navigate" action is dispatched', async () => {
      getState.mockReturnValueOnce({
        views: {
          open: {
            [viewId]: {
              location: '/old-location',
            },
          },
        },
      });
      const middleware = createRouterMiddleware({
        locationChanged$,
        call,
      })({ dispatch, getState })(next => next);

      const navigateAction = actions.views.navigate(viewId, '/new-location');
      middleware(navigateAction);
      await new Promise(process.nextTick);
      expect(call).toHaveBeenCalledWith(navigateAction.payload);
    });

    it('does not call "viewsHistory.call" when "navigate" action to same url is dispatched', async () => {
      getState.mockReturnValueOnce({
        views: {
          open: {
            [viewId]: {
              location: '/old-location',
            },
          },
        },
      });
      const middleware = createRouterMiddleware({
        locationChanged$,
        call,
      })({ dispatch, getState })(next => next);

      const navigateAction = actions.views.navigate(viewId, '/old-location');
      middleware(navigateAction);
      await new Promise(process.nextTick);
      expect(call).not.toHaveBeenCalled();
    });
  });
});
