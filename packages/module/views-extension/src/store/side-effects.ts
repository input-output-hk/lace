import { toEmpty } from '@cardano-sdk/util-rxjs';
import { RemoteApiShutdownError } from '@lace-sdk/extension-messaging';
import {
  EMPTY,
  catchError,
  filter,
  map,
  merge,
  mergeMap,
  of,
  takeUntil,
  withLatestFrom,
} from 'rxjs';

import { callKeepAlive } from './call-keep-alive';
import { viewClose } from './side-effect-util';

import type { SideEffect } from '..';
import type { LaceInitSync } from '@lace-contract/module';

export const connectView: SideEffect = (
  actionObservables,
  _,
  { viewConnect$, logger, actions },
) =>
  viewConnect$.pipe(
    mergeMap(({ view, api }) =>
      merge(
        viewClose(actionObservables, view).pipe(
          mergeMap(() => api.close()),
          catchError(error => {
            if (error instanceof RemoteApiShutdownError) {
              // expected, as it receives no response from the api call
            } else {
              logger.error('Failed to close view', error);
            }
            return EMPTY;
          }),
          mergeMap(() => EMPTY),
        ),
        of(actions.views.viewConnected(view)),
      ).pipe(
        takeUntil(
          actionObservables.views.viewDisconnected$.pipe(
            filter(action => action.payload === view.id),
          ),
        ),
      ),
    ),
  );

export const disconnectView: SideEffect = (
  _,
  __,
  { viewDisconnect$, actions },
) =>
  viewDisconnect$.pipe(map(viewId => actions.views.viewDisconnected(viewId)));

export const openView: SideEffect = (
  { views: { openView$ } },
  { views: { selectOpenViews$ } },
  { logger, openPopupWindow, highlightTab },
) =>
  openView$.pipe(
    withLatestFrom(selectOpenViews$),
    mergeMap(([{ payload }, openViews]) => {
      if (payload.type === 'popupWindow') {
        const existing = openViews.find(
          v => v.type === 'popupWindow' && v.location === payload.location,
        );
        if (existing) {
          return highlightTab(Number(existing.id));
        }
        return openPopupWindow(payload.location);
      }
      logger.error(`Opening view of type "${payload.type}" is not supported`);
      return EMPTY;
    }),
    toEmpty,
  );

const keepAlive: SideEffect = (
  actionObservables,
  _,
  { viewConnect$, logger },
) => callKeepAlive(actionObservables, viewConnect$, logger).pipe(toEmpty);

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [connectView, disconnectView, openView, keepAlive];
};
