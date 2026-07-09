import * as Updates from 'expo-updates';
import { distinctUntilChanged, filter, from, map } from 'rxjs';

import { appState$ } from './app-state-listener';
import { reloadGate$ } from './reload-gate';
import {
  checkBiometricAvailability,
  lockOnBackground,
  makeReloadAppInTheBackground,
} from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const performAppReload = () => from(Updates.reloadAsync());

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [
    lockOnBackground,
    checkBiometricAvailability,
    makeReloadAppInTheBackground(reloadGate$),
  ],
  sideEffectDependencies: {
    featureFlagRefreshTrigger$: appState$.pipe(
      distinctUntilChanged(),
      filter(state => state === 'active'),
      map((): void => undefined),
    ),
    performAppReload,
  },
});

export default store;
