import type { Action, State } from '@lace-contract/module';
import type { Store, Unsubscribe } from '@reduxjs/toolkit';

export const waitForState = async (
  predicate: (state: State) => boolean,
  store: Store<State, Action>,
) =>
  new Promise<State>(resolve => {
    let unsubscribe: Unsubscribe | undefined;
    const check = () => {
      const state = store.getState();
      if (predicate(state)) {
        unsubscribe?.();
        resolve(state);
        return true;
      }
    };
    if (!check()) {
      unsubscribe = store.subscribe(check);
    }
  });
