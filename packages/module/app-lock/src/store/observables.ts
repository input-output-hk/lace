import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Observable for `isWalletActive$`. Wired to `appLockSelectors.appLock.isWalletActive$`
 * by `wireIsWalletActiveObservable` in this module. Exposed as a side effect dependency
 * via `walletActiveStateDependencyContract`.
 *
 * Defaults to `true` so that any subscriber is immediately receptive before the
 * wiring side effect emits its first value.
 */
export const isWalletActive$ = new BehaviorSubject<boolean>(true);

/**
 * Fires each time the wallet resumes from a paused period — the
 * `Unlocking → Unlocked` lock-state transition. Driven by
 * `emitWalletResumedObservable` in this module. Exposed as a side effect
 * dependency via `walletActiveStateDependencyContract`.
 *
 * Narrower than a rising edge on `isWalletActive$` — that signal also
 * rises on `Preparing → AwaitingSetup` (first-run boot) and
 * `AwaitingSetup → Unlocked` (first-run setup completion), neither of
 * which follows a pause.
 */
export const walletResumed$ = new Subject<void>();
