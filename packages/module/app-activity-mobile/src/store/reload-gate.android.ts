import { filter, pairwise, take } from 'rxjs';

import { appState$ } from './app-state-listener';

import type { Observable } from 'rxjs';

/**
 * Android reload gate: emits exactly once on the next background→foreground
 * transition. Android does not suspend the JS thread in background the way
 * iOS does, and `Updates.reloadAsync()` needs the Activity to be visible to
 * recreate the React context cleanly — calling it while backgrounded leaves
 * the user staring at the old bundle when they return. Waiting for the
 * Activity to be active again gives Android the conditions it needs to swap
 * the bundle cleanly. `isUnlocked$` is unused: the iOS-specific worklet UAF
 * doesn't exist on Android, so we don't need to gate on lock state.
 */
export const reloadGate$ = (
  _isUnlocked$: Observable<boolean>,
): Observable<unknown> =>
  appState$.pipe(
    pairwise(),
    filter(
      ([previous, current]) => previous !== 'active' && current === 'active',
    ),
    take(1),
  );
