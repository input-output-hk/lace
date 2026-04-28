import type { AppStateStatus } from 'react-native';

import { appLockActions } from '@lace-contract/app-lock';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  checkBiometricAvailability,
  lockOnBackground,
} from '../../src/store/side-effects';

// eslint-disable-next-line functional/no-let
let appState$: Subject<AppStateStatus>;

vi.mock('../../src/store/app-state-listener', () => ({
  get appState$() {
    return appState$;
  },
}));

const actions = {
  ...appLockActions,
  ...authenticationPromptActions,
};

describe('app-activity-mobile side effects', () => {
  describe('lockOnBackground', () => {
    it('dispatches locked when app goes to background while unlocked', () => {
      appState$ = new Subject();
      testSideEffect(lockOnBackground, ({ flush }) => ({
        stateObservables: {
          appLock: {
            isUnlocked$: of(true),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');
          appState$.next('background');

          expect(emissions).toEqual([actions.appLock.locked()]);
        },
      }));
    });

    it('does not dispatch locked when app is not unlocked', () => {
      appState$ = new Subject();
      testSideEffect(lockOnBackground, ({ flush }) => ({
        stateObservables: {
          appLock: {
            isUnlocked$: of(false),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');
          appState$.next('background');

          expect(emissions).toEqual([]);
        },
      }));
    });

    it('does not dispatch locked when state changes to active', () => {
      appState$ = new Subject();
      testSideEffect(lockOnBackground, ({ flush }) => ({
        stateObservables: {
          appLock: {
            isUnlocked$: of(true),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');

          expect(emissions).toEqual([]);
        },
      }));
    });

    it('ignores duplicate background states', () => {
      appState$ = new Subject();
      testSideEffect(lockOnBackground, ({ flush }) => ({
        stateObservables: {
          appLock: {
            isUnlocked$: of(true),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');
          appState$.next('background');
          appState$.next('background');

          expect(emissions).toEqual([actions.appLock.locked()]);
        },
      }));
    });
  });

  describe('checkBiometricAvailability', () => {
    it('dispatches checkBiometricAvailability when app becomes active', () => {
      appState$ = new Subject();
      testSideEffect(checkBiometricAvailability, ({ flush }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('background');
          appState$.next('active');

          expect(emissions).toEqual([
            actions.authenticationPrompt.checkBiometricAvailability(),
          ]);
        },
      }));
    });

    it('ignores duplicate active states', () => {
      appState$ = new Subject();
      testSideEffect(checkBiometricAvailability, ({ flush }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');
          appState$.next('active');

          expect(emissions).toEqual([
            actions.authenticationPrompt.checkBiometricAvailability(),
          ]);
        },
      }));
    });

    it('does not dispatch when app goes to background', () => {
      appState$ = new Subject();
      testSideEffect(checkBiometricAvailability, ({ flush }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          appState$.next('active');
          appState$.next('background');

          expect(emissions).toEqual([
            actions.authenticationPrompt.checkBiometricAvailability(),
          ]);
        },
      }));
    });
  });
});
