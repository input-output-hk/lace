import { combineLatest, filter, take } from 'rxjs';

import { appState$ } from './app-state-listener';

import type { Observable } from 'rxjs';

/**
 * iOS reload gate: emits exactly once when the app is backgrounded AND
 * locked. The dispatch is queued while iOS suspends the JS thread; when JS
 * resumes on the next foreground, the queued `reloadApplication` action is
 * processed before React Native re-spins gesture-handler / Reanimated
 * worklets on the UI runtime. That timing — `Updates.reloadAsync()` running
 * before the worklet queue is re-populated — avoids the use-after-free in
 * `SerializableWorklet::toJSValue` that crashes on iOS when reload races
 * worklet scheduling.
 */
export const reloadGate$ = (
  isUnlocked$: Observable<boolean>,
): Observable<unknown> =>
  combineLatest([appState$, isUnlocked$]).pipe(
    filter(([state, unlocked]) => state === 'background' && unlocked === false),
    take(1),
  );
