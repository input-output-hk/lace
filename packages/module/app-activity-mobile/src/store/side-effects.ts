import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import { appState$ } from './app-state-listener';

import type { SideEffect } from '../';

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

export const sideEffects: SideEffect[] = [
  lockOnBackground,
  checkBiometricAvailability,
];
