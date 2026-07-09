import type { AppStateStatus } from 'react-native';

import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { reloadGate$ } from '../../src/store/reload-gate.ios';

// eslint-disable-next-line functional/no-let
let appState$: Subject<AppStateStatus>;

vi.mock('../../src/store/app-state-listener', () => ({
  get appState$() {
    return appState$;
  },
}));

describe('reload-gate (iOS)', () => {
  it('emits once when state reaches background AND unlocked is false', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    isUnlocked$.next(true);
    appState$.next('active');
    expect(emissions).toEqual([]);

    appState$.next('background');
    expect(emissions).toEqual([]);

    isUnlocked$.next(false);
    expect(emissions).toHaveLength(1);
  });

  it('does not emit while app is in foreground', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('active');
    isUnlocked$.next(false);

    expect(emissions).toEqual([]);
  });

  it('does not emit while app is backgrounded but still unlocked', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    isUnlocked$.next(true);
    appState$.next('background');

    expect(emissions).toEqual([]);
  });

  it('completes after the first emission (take(1))', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    let hasCompleted = false;
    reloadGate$(isUnlocked$).subscribe({
      next: value => emissions.push(value),
      complete: () => {
        hasCompleted = true;
      },
    });

    appState$.next('background');
    isUnlocked$.next(false);
    expect(hasCompleted).toBe(true);

    // Further emissions are ignored
    appState$.next('background');
    isUnlocked$.next(false);
    expect(emissions).toHaveLength(1);
  });
});
