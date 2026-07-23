import { auditTime, distinctUntilChanged, Observable } from 'rxjs';

import type { RemoteStore } from '../util/types';
import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

// Heavy reference catalogs that make up ~95% of the redux state by size but are
// read only when their feature tab opens — never during first paint:
//   cardanoStakePools (~1.26 MB), swapConfig (~0.94 MB), dappExplorer (~0.20 MB).
// Seeding `getFirstPaintState` with their empty initial value
// instead of the full catalogs cuts the SW→UI round-trip payload from ~2.5 MB
// to ~120 KB. The full catalogs arrive immediately afterwards over `state$`
// (the SW replays the latest full state to every new subscriber) and
// `connectStore`'s jsondiffpatch backfills them right after first paint.
//
// `satisfies` ties these keys to the real state shape, so a slice rename breaks
// the build instead of silently shipping the full catalog again.
const FIRST_PAINT_DEFERRED_SLICES = [
  'cardanoStakePools',
  'swapConfig',
  'dappExplorer',
] as const satisfies readonly (keyof State)[];

export const createRemoteStore = (
  store: Readonly<Store<State, Action>>,
  initialState: Readonly<State>,
): RemoteStore => {
  // Precompute the empty-value overrides once. A deferred slice may be absent
  // (its feature flag / module is off), so only override keys that exist in the
  // initial snapshot — this preserves the "every loaded slice is present"
  // invariant without inventing keys for unloaded slices. The empty value is
  // exactly what each slice holds at cold boot before its data loads, so every
  // selector already tolerates it during the brief first-paint → backfill gap.
  const firstPaintStateOverrides = Object.fromEntries(
    FIRST_PAINT_DEFERRED_SLICES.filter(key => key in initialState).map(
      key => [key, initialState[key]] as const,
    ),
  ) as Partial<State>;

  return {
    dispatch: async (action): Promise<void> => {
      store.dispatch(action);
    },
    // First paint never reads the heavy catalogs; ship them empty here and let
    // `state$` backfill the full values (see FIRST_PAINT_DEFERRED_SLICES). Only
    // this initial seed shrinks — `state$` carries the full state unchanged.
    getFirstPaintState: async () => ({
      ...store.getState(),
      ...firstPaintStateOverrides,
    }),
    // Redux notifies subscribers on every dispatch even when no slice changed;
    // combineReducers returns the same root ref in that case, so
    // distinctUntilChanged drops those no-op dispatches before they cross the
    // messaging bridge to the UI.
    //
    // Coalesce SW state emissions to one push per frame. `connectStore` runs a
    // full-tree `jsondiffpatch.diff` + render cascade per emission on the same
    // JS thread as reanimated, so bursts (e.g. confirm-then-mutate) drop frames
    // on web. Removing this restores N diffs per N actions — correct, just janky.
    state$: new Observable<State>(subscriber =>
      store.subscribe(() => {
        subscriber.next(store.getState());
      }),
    ).pipe(distinctUntilChanged(), auditTime(16)),
  };
};
