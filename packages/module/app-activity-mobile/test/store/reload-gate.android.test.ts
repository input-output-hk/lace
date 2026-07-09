import type { AppStateStatus } from 'react-native';

import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { reloadGate$ } from '../../src/store/reload-gate.android';

// eslint-disable-next-line functional/no-let
let appState$: Subject<AppStateStatus>;

vi.mock('../../src/store/app-state-listener', () => ({
  get appState$() {
    return appState$;
  },
}));

describe('reload-gate (Android)', () => {
  it('emits once on background→foreground transition', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('active');
    appState$.next('background');
    expect(emissions).toEqual([]);

    appState$.next('active');
    expect(emissions).toHaveLength(1);
  });

  it('does not emit on the initial active state alone', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('active');

    expect(emissions).toEqual([]);
  });

  it('does not emit on active→background', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('active');
    appState$.next('background');

    expect(emissions).toEqual([]);
  });

  it('emits when previous state is inactive (treats anything non-active as the prior state)', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('inactive');
    appState$.next('active');

    expect(emissions).toHaveLength(1);
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
    appState$.next('active');
    expect(hasCompleted).toBe(true);

    appState$.next('background');
    appState$.next('active');
    expect(emissions).toHaveLength(1);
  });

  it('ignores isUnlocked$ — gate is independent of lock state', () => {
    appState$ = new Subject();
    const isUnlocked$ = new Subject<boolean>();
    const emissions: unknown[] = [];
    reloadGate$(isUnlocked$).subscribe(value => emissions.push(value));

    appState$.next('background');
    appState$.next('active');
    // Gate emits regardless of lock state (no value pushed to isUnlocked$)
    expect(emissions).toHaveLength(1);
  });
});
