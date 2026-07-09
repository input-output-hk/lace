import { auditTime, Observable } from 'rxjs';

import type { RemoteStore } from '../util/types';
import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

export const createRemoteStore = (
  store: Readonly<Store<State, Action>>,
): RemoteStore => ({
  dispatch: async (action): Promise<void> => {
    store.dispatch(action);
  },
  getState: async () => store.getState(),
  // Coalesce SW state emissions to one push per frame. `connectStore` runs a
  // full-tree `jsondiffpatch.diff` + render cascade per emission on the same
  // JS thread as reanimated, so bursts (e.g. confirm-then-mutate) drop frames
  // on web. Removing this restores N diffs per N actions — correct, just janky.
  state$: new Observable<State>(subscriber =>
    store.subscribe(() => {
      subscriber.next(store.getState());
    }),
  ).pipe(auditTime(16)),
});
