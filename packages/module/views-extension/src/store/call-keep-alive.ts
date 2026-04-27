import { Milliseconds } from '@lace-sdk/util';
import {
  EMPTY,
  catchError,
  concat,
  interval,
  map,
  mergeMap,
  of,
  scan,
  switchMap,
} from 'rxjs';

import { sampleWithDuplicates } from './sample-with-duplicates';
import { viewClose } from './side-effect-util';

import type { ActionCreators } from '..';
import type { ConnectedView, ObservableExtensionViewApi } from './dependencies';
import type { ActionObservables, ViewId } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

export const KEEP_ALIVE_INTERVAL = Milliseconds(20_000);

type MaybeConnectedView = {
  api: ObservableExtensionViewApi | null;
  view: View;
};
const connectedViewThatEventuallyDisconnects =
  (actionObservables: ActionObservables<ActionCreators>) =>
  (connectedView: ConnectedView): Observable<MaybeConnectedView> =>
    concat(
      of(connectedView),
      viewClose(actionObservables, connectedView.view).pipe(
        map(() => ({ view: connectedView.view, api: null })),
      ),
    );

type ApiByViewId = Record<ViewId, ObservableExtensionViewApi>;
const setApiByViewId = (
  accumulator: ApiByViewId,
  { view: { id }, api }: MaybeConnectedView,
) => {
  if (api) {
    accumulator[id] = api;
  } else {
    delete accumulator[id];
  }
  return accumulator;
};

const intervalSinceViewConnect = (
  viewConnect$: Observable<ConnectedView>,
  intervalMs: Milliseconds,
) => viewConnect$.pipe(switchMap(() => interval(intervalMs)));

const callAnyKeepAlive = (logger: Logger) => (apis: ApiByViewId) => {
  const anyApi = Object.entries(apis)[0];
  if (!anyApi) return EMPTY;
  return anyApi[1].keepAlive().pipe(
    catchError(error => {
      logger.error('Failed to call keepAlive', error);
      return EMPTY;
    }),
  );
};

/**
 * Service worker goes 'inactive' after 30s of inactivity (or 5min, depending on type of activity).
 *
 * Whenever there is at least 1 view connected, call a remote method (essentially ping-pong)
 * every 20s in order to keep service worker active. Timer resets every time a view connects,
 * because a new connection event works just as well as ping-pong to keep SW alive.
 */
export const callKeepAlive = (
  actionObservables: ActionObservables<ActionCreators>,
  viewConnect$: Observable<ConnectedView>,
  logger: Logger,
) =>
  viewConnect$.pipe(
    mergeMap(connectedViewThatEventuallyDisconnects(actionObservables)),
    scan(setApiByViewId, {}),
    sampleWithDuplicates(
      intervalSinceViewConnect(viewConnect$, KEEP_ALIVE_INTERVAL),
    ),
    switchMap(callAnyKeepAlive(logger)),
  );
