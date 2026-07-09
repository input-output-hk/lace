import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import { appState$ } from './app-state-listener';

import type { SideEffect } from '../';
import type { Observable } from 'rxjs';

export type ReloadGate = (
  isUnlocked$: Observable<boolean>,
) => Observable<unknown>;

export const lockOnBackground: SideEffect = (
  _,
  { appLock: { isUnlocked$ } },
  { actions },
) =>
  isUnlocked$.pipe(
    switchMap(isUnlocked =>
      appState$.pipe(
        filter(() => isUnlocked),
        distinctUntilChanged(),
        filter(state => state === 'background'),
        map(() => actions.appLock.locked()),
      ),
    ),
  );

export const checkBiometricAvailability: SideEffect = (_, __, { actions }) =>
  appState$.pipe(
    distinctUntilChanged(),
    filter(state => state === 'active'),
    map(() => actions.authenticationPrompt.checkBiometricAvailability()),
  );

/**
 * Builds the side-effect that dispatches `reloadApplication` once feature
 * flags update AND the platform-specific `reloadGate$` permits the reload.
 * The gate determines when on-device conditions are right to swap the JS
 * bundle: see `reload-gate.ios.ts` / `reload-gate.android.ts`. `switchMap`
 * ensures the latest update wins if flags change again before the gate
 * fires.
 */
export const makeReloadAppInTheBackground =
  (reloadGate$: ReloadGate): SideEffect =>
  (
    { features: { updateFeatures$ } },
    { appLock: { isUnlocked$ } },
    { actions },
  ) =>
    updateFeatures$.pipe(
      switchMap(() =>
        reloadGate$(isUnlocked$).pipe(
          map(() => actions.app.reloadApplication()),
        ),
      ),
    );
