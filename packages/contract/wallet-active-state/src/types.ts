import type { Observable } from 'rxjs';

export interface WalletActiveStateDependencies {
  /**
   * Emits `true` whenever the wallet should perform background work
   * (polling, watchers, long-lived subscriptions) and `false` while it
   * should pause. Used together with the `whileActive` operator.
   */
  isWalletActive$: Observable<boolean>;
  /**
   * Rising edge of `isWalletActive$` after a genuine pause — i.e. the
   * `Unlocking → Unlocked` transition. Use this for side effects that
   * must run only when the wallet resumes from a paused period
   * (e.g. recovering stale state accumulated during the lock). Distinct
   * from `Preparing → AwaitingSetup` (first-run boot) and
   * `AwaitingSetup → Unlocked` (first-run setup completion), both of
   * which present as `isWalletActive$` rising edges but follow no pause.
   *
   * Shares `isWalletActive$`'s flag-aware semantics: never emits when
   * `PAUSE_NETWORK_POLLING_WHILE_LOCKED` is disabled, since in that
   * configuration `whileActive` never pauses anything and there is no
   * pause to resume from.
   */
  walletResumed$: Observable<void>;
}
