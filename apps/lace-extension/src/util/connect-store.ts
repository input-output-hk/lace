import { consumeRemoteApi } from '@lace-sdk/extension-messaging';
import { produce } from 'immer';
import * as jsondiffpatch from 'jsondiffpatch';

import { logger, remoteStoreApiProperties, STORE_CHANNEL } from '.';

import type { LaceStore } from '.';
import type { State } from '@lace-contract/module';
import type { MinimalRuntime } from '@lace-sdk/extension-messaging';

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
      properties: remoteStoreApiProperties,
    },
    { logger, runtime },
  );
  let state: State;
  do {
    try {
      state = await remoteStore.getState();
    } catch {
      state = undefined as unknown as State;
      // instead of this try-catch, fix messaging to reconnect and resolve when it's available
      // The error is when service worker goes to sleep, it's getting
      // "Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist."
    }
  } while (!state);
  const listenerCallbacks: (() => void)[] = [];
  const subscription = remoteStore.state$.subscribe(newRemoteState => {
    state = produceNextState(state, newRemoteState);
    for (const callback of listenerCallbacks) {
      callback();
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
