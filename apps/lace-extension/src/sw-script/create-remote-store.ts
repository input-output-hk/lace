import { Observable } from 'rxjs';

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
  state$: new Observable(subscriber =>
    store.subscribe(() => {
      subscriber.next(store.getState());
    }),
  ),
});
