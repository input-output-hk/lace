import { EMPTY, mergeMap, of } from 'rxjs';

import type { ConnectedView, ViewsExtensionDependencies } from './dependencies';
import type { ViewId } from '@lace-contract/module';
import type {
  LocationChangedPayload,
  ViewsHistory,
} from '@lace-contract/views';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

export const createExtensionViewsHistory = (
  {
    viewConnect$,
    viewDisconnect$,
  }: Pick<ViewsExtensionDependencies, 'viewConnect$' | 'viewDisconnect$'>,
  logger: Logger,
): ViewsHistory => {
  const views: Partial<Record<ViewId, ConnectedView>> = {};
  viewConnect$.subscribe(
    connectedView => (views[connectedView.view.id] = connectedView),
  );
  viewDisconnect$.subscribe(viewId => delete views[viewId]);
  return {
    call: ({ viewId, ...rest }) => {
      const view = views[viewId];
      if (!view) {
        logger.warn(
          `Failed to call history method: view "${viewId} is not open"`,
          rest,
        );
        return;
      }
      if (rest.method === 'push' && typeof rest.args[0] === 'string') {
        view.api
          .callHistoryMethod({
            method: 'push',
            args: [{ hash: rest.args[0] === '/' ? '' : rest.args[0] }],
          })
          .subscribe();
      } else {
        view.api.callHistoryMethod(rest).subscribe();
      }
    },
    locationChanged$: viewConnect$.pipe(
      mergeMap(({ api, view }) =>
        api.locationChanged$.pipe(
          mergeMap((location, eventNo): Observable<LocationChangedPayload> => {
            // Do not emit locationChanged action for initial load
            if (eventNo === 0 && location === view.location) return EMPTY;
            return of({
              location,
              viewId: view.id,
            });
          }),
        ),
      ),
    ),
  };
};
