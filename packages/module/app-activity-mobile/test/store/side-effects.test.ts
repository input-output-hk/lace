import type { AppStateStatus } from 'react-native';

import { appActions } from '@lace-contract/app';
import { appLockActions } from '@lace-contract/app-lock';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { featuresActions } from '@lace-contract/feature';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  checkBiometricAvailability,
  lockOnBackground,
  makeReloadAppInTheBackground,
} from '../../src/store/side-effects';

// eslint-disable-next-line functional/no-let
let appState$: Subject<AppStateStatus>;

vi.mock('../../src/store/app-state-listener', () => ({
  get appState$() {
    return appState$;
  },
}));

const actions = {
  ...appActions,
  ...appLockActions,
  ...authenticationPromptActions,
  ...featuresActions,
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

  describe('makeReloadAppInTheBackground', () => {
    const featuresPayload = { featureFlags: [], modules: [] };

    it('dispatches reloadApplication when the gate emits after a feature update', () => {
      appState$ = new Subject();
      const updateFeatures$ = new Subject<
        ReturnType<typeof actions.features.updateFeatures>
      >();
      const isUnlocked$ = new Subject<boolean>();
      const gate$ = new Subject<unknown>();

      const reloadAppInTheBackground = makeReloadAppInTheBackground(
        () => gate$,
      );

      testSideEffect(reloadAppInTheBackground, ({ flush }) => ({
        actionObservables: { features: { updateFeatures$ } },
        stateObservables: { appLock: { isUnlocked$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          updateFeatures$.next(
            actions.features.updateFeatures(featuresPayload),
          );
          expect(emissions).toEqual([]);

          gate$.next(undefined);
          expect(emissions).toEqual([actions.app.reloadApplication()]);
        },
      }));
    });

    it('does not dispatch before a feature update arrives', () => {
      appState$ = new Subject();
      const updateFeatures$ = new Subject<
        ReturnType<typeof actions.features.updateFeatures>
      >();
      const isUnlocked$ = new Subject<boolean>();
      const gate$ = new Subject<unknown>();

      const reloadAppInTheBackground = makeReloadAppInTheBackground(
        () => gate$,
      );

      testSideEffect(reloadAppInTheBackground, ({ flush }) => ({
        actionObservables: { features: { updateFeatures$ } },
        stateObservables: { appLock: { isUnlocked$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          // Gate emits before any feature update — orchestrator hasn't
          // subscribed to it yet via switchMap, so the emission is dropped.
          gate$.next(undefined);
          expect(emissions).toEqual([]);
        },
      }));
    });

    it('passes isUnlocked$ to the gate', () => {
      appState$ = new Subject();
      const updateFeatures$ = new Subject<
        ReturnType<typeof actions.features.updateFeatures>
      >();
      const isUnlocked$ = new Subject<boolean>();
      const gate = vi.fn(() => new Subject<unknown>());

      const reloadAppInTheBackground = makeReloadAppInTheBackground(gate);

      testSideEffect(reloadAppInTheBackground, ({ flush }) => ({
        actionObservables: { features: { updateFeatures$ } },
        stateObservables: { appLock: { isUnlocked$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          updateFeatures$.next(
            actions.features.updateFeatures(featuresPayload),
          );

          expect(gate).toHaveBeenCalledWith(isUnlocked$);
        },
      }));
    });

    it('latest update wins via switchMap when flags change again before the gate fires', () => {
      appState$ = new Subject();
      const updateFeatures$ = new Subject<
        ReturnType<typeof actions.features.updateFeatures>
      >();
      const isUnlocked$ = new Subject<boolean>();
      const gate$ = new Subject<unknown>();

      const reloadAppInTheBackground = makeReloadAppInTheBackground(
        () => gate$,
      );

      testSideEffect(reloadAppInTheBackground, ({ flush }) => ({
        actionObservables: { features: { updateFeatures$ } },
        stateObservables: { appLock: { isUnlocked$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          updateFeatures$.next(
            actions.features.updateFeatures(featuresPayload),
          );
          updateFeatures$.next(
            actions.features.updateFeatures(featuresPayload),
          );
          gate$.next(undefined);

          expect(emissions).toEqual([actions.app.reloadApplication()]);
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
