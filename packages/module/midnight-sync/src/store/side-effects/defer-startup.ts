import { whileActive } from '@lace-contract/wallet-active-state';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  map,
  switchMap,
  take,
  timer,
} from 'rxjs';

import type { SideEffect } from '../../context';

// A scheduling grace period, not evidence that the remote UI has painted.
const UNLOCK_RENDER_GRACE_MS = 250;

export const deferMidnightStartupUntilUnlocked =
  (watch: SideEffect): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    if (dependencies.runtime.platform !== 'web-extension')
      return watch(actionObservables, stateObservables, dependencies);

    return combineLatest([
      stateObservables.appLock.selectLockState$,
      stateObservables.authenticationPrompt.isOpen$,
    ]).pipe(
      map(
        ([lock, isPromptOpen]) =>
          (lock.status === 'Unlocked' || lock.status === 'AwaitingSetup') &&
          !isPromptOpen,
      ),
      distinctUntilChanged(),
      // Restoration can monopolize the worker before its unlock response
      // reaches the UI. Wait for authentication to finish, then yield before
      // subscribing to anything that reads and restores wallet snapshots.
      switchMap(ready => (ready ? timer(UNLOCK_RENDER_GRACE_MS) : EMPTY)),
      take(1),
      switchMap(() => watch(actionObservables, stateObservables, dependencies)),
      // Retain lock teardown and repeat the grace period on a real resume.
      // Once started, ordinary transaction-auth prompts do not restart sync.
      whileActive(dependencies.isWalletActive$),
    );
  };
