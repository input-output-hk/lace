import {
  createStateObservables,
  loadedSelectors,
  type ContextualLaceInit,
  type State,
} from '@lace-contract/module';
import { Observable, type Subscription, shareReplay } from 'rxjs';

import { fuseSearch } from './utils/fuseSearch';

import type { AvailableAddons } from './index';
import type { InitializeExtensionView } from '@lace-contract/views';

/**
 * Extension `LaceStore` and mobile Redux `Store` both satisfy this.
 */
type ReduxStoreLike = {
  getState: () => State;
  subscribe(listener: () => void): () => void;
};

const stateObservableFromStore = (store: ReduxStoreLike): Observable<State> =>
  new Observable<State>(subscriber => {
    subscriber.next(store.getState());
    return store.subscribe(() => {
      subscriber.next(store.getState());
    });
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

/** Useful just for hot reloads. */
// eslint-disable-next-line functional/no-let
let subscription: Subscription | undefined;

/**
 * Runs once per UI load (extension popup/tab or mobile). Wires the fuzzy-search
 * singleton to selector observables for that store instance.
 *
 * Shared by `loadInitializeExtensionView` and `loadInitializeMobileView` (same
 * contract type in `views`).
 */
const initializeView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> = () => async store => {
  const uiStore = store as unknown as ReduxStoreLike;
  const state = createStateObservables(
    stateObservableFromStore(uiStore),
    loadedSelectors,
  ).cardanoStakePools;

  subscription?.unsubscribe();
  subscription = state ? fuseSearch.connect(state) : undefined;
};

export default initializeView;
