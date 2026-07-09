import { distinctUntilChanged, EMPTY, switchMap } from 'rxjs';

import type { Observable } from 'rxjs';

/**
 * RxJS operator that gates a source observable on `isWalletActive$`.
 *
 * - When `isWalletActive$` emits `false`: the source subscription is
 *   unsubscribed. If `whileActive` sits at the end of the pipe, this tears
 *   down the entire upstream chain (intervals stop, in-flight requests
 *   cancelled, WebSockets close via `finalize`).
 * - When `isWalletActive$` emits `true`: a fresh source subscription starts.
 *
 * Place at the **end** of the polling pipeline so its source observable is
 * the whole chain. Mid-pipeline placement before a `switchMap` with an
 * infinite inner (`interval`, WebSocket) is incorrect: `whileActive`'s output
 * stops emitting on lock but does not complete or error, and RxJS only tears
 * down a `switchMap` inner on a new emission, completion, or error from its
 * outer — so the inner keeps polling. See ADR 25 for the rule and the leak
 * mechanics.
 *
 * Required for any side effect that uses `interval()`, `timer()`, or
 * establishes long-lived connections. See ADR 25.
 */
export const whileActive =
  (isWalletActive$: Observable<boolean>) =>
  <T>(source$: Observable<T>): Observable<T> =>
    isWalletActive$.pipe(
      distinctUntilChanged(),
      switchMap(isActive => (isActive ? source$ : EMPTY)),
    );
