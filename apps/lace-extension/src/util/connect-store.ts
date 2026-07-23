import { consumeRemoteApi } from '@lace-lib/extension-messaging';
import { produce } from 'immer';
import * as jsondiffpatch from 'jsondiffpatch';

import { logger, remoteStoreApiProperties, STORE_CHANNEL } from '.';

import type { LaceStore } from '.';
import type { State } from '@lace-contract/module';
import type { MinimalRuntime } from '@lace-lib/extension-messaging';

/**
 * produce an immutable state update based on the json diff patch between two states
 */
export const produceNextState = (currentState: State, remoteState: State) => {
  const delta = jsondiffpatch.diff(currentState, remoteState);
  // produce an immutable state update based on the json diff patch
  // between remote store and this non-background store
  return produce(currentState, draft => {
    jsondiffpatch.patch(draft, delta);
  });
};

export const connectStore = async ({
  runtime,
}: {
  runtime: MinimalRuntime;
}): Promise<LaceStore> => {
  const remoteStore = consumeRemoteApi(
    {
      baseChannel: STORE_CHANNEL,
      keepAlivePingPong: true,
      properties: remoteStoreApiProperties,
    },
    { logger, runtime },
  );
  let state: State;
  do {
    try {
      state = await remoteStore.getFirstPaintState();
    } catch {
      state = undefined as unknown as State;
      // instead of this try-catch, fix messaging to reconnect and resolve when it's available
      // The error is when service worker goes to sleep, it's getting
      // "Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist."
    }
  } while (!state);
  const listenerCallbacks: (() => void)[] = [];
  const subscription = remoteStore.state$.subscribe(newRemoteState => {
    const previousState = state;
    state = produceNextState(previousState, newRemoteState);
    // Skip the subscriber cascade when the produced ref is unchanged. The
    // service worker emits a new state whenever any slice ref changes, but a
    // reducer can return a new slice ref holding the same value; in that case
    // jsondiffpatch finds no delta and immer returns the identical ref, so no
    // selector output can change and there is nothing to re-render.
    if (state !== previousState) {
      for (const callback of listenerCallbacks) {
        callback();
      }
    }
  });
  return {
    dispatch: action => {
      void remoteStore.dispatch(action);
      return action;
    },
    getState: () => state,
    replaceReducer: (): void => {
      throw new Error('replaceReducer is not implemented for remote store');
    },
    subscribe: callback => {
      listenerCallbacks.push(callback);
      return () => {
        listenerCallbacks.splice(listenerCallbacks.indexOf(callback), 1);
      };
    },
    shutdown: (): void => {
      subscription.unsubscribe();
      remoteStore.shutdown();
    },
    [Symbol.observable]: () => {
      return {
        subscribe: remoteStore.state$.subscribe.bind(remoteStore.state$),
        [Symbol.observable]() {
          return this;
        },
      };
    },
  };
};
