import { isAnyOf } from '@reduxjs/toolkit';

import { viewsActions, viewsSelectors } from './slice';

import type {
  CallHistoryMethodPayload,
  HistoryMethod,
  LocationChangedPayload,
} from './slice';
import type { Middleware } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

export interface ViewsHistory {
  call: <M extends HistoryMethod>(payload: CallHistoryMethodPayload<M>) => void;
  locationChanged$: Observable<LocationChangedPayload>;
}

export const createRouterMiddleware =
  (viewsHistory: ViewsHistory): Middleware =>
  ({ dispatch, getState }) => {
    viewsHistory.locationChanged$.subscribe(payload =>
      dispatch(viewsActions.views.locationChanged(payload)),
    );
    return next => action => {
      next(action);
      if (!isAnyOf(viewsActions.views.navigate)(action)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const viewState = viewsSelectors.views.selectOpenViewsMap(getState())[
        action.payload.viewId
      ];
      if (!viewState) {
        return;
      }

      if (viewState.location !== action.payload.args[0]) {
        queueMicrotask(() => {
          viewsHistory.call(action.payload);
        });
      }
    };
  };
