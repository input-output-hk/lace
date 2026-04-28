import { Milliseconds } from '@lace-sdk/util';
import {
  BehaviorSubject,
  catchError,
  defer,
  distinctUntilChanged,
  EMPTY,
  map,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
  throwError,
  timer,
} from 'rxjs';

import type {
  AccountKeyManager,
  AccountKeys,
} from '@lace-contract/midnight-context';
import type { Observable, Subscription } from 'rxjs';

export type CreateAccountKeyManagerParams = {
  requestKeys: () => Observable<AccountKeys>;
  idleTimeout?: Milliseconds;
};

const DEFAULT_IDLE_TIMEOUT_MS = Milliseconds(20_000);

/**
 * Creates an AccountKeyManager that manages caching and lifecycle of account keys.
 *
 * - keys$: Returns cached keys immediately if available, otherwise triggers requestKeys.
 *          Each access resets the idle timer.
 * - areKeysAvailable$: Reflects whether keys are currently cached.
 * - Idle timeout: After configured period with no access, keys are zeroized and cache cleared.
 * - destroy(): Clears cached keys, completes observables, and cleans up subscriptions.
 */
export const createAccountKeyManager = (
  params: CreateAccountKeyManagerParams,
): AccountKeyManager => {
  const { requestKeys, idleTimeout = DEFAULT_IDLE_TIMEOUT_MS } = params;

  // Track destroyed state
  let isDestroyed = false;

  // Cache for keys - null means no keys cached
  const cache$ = new BehaviorSubject<AccountKeys | null>(null);

  // Subject to signal each key access (for resetting idle timer)
  const access$ = new Subject<void>();

  // Track pending request to share among concurrent subscribers
  let pendingRequest$: Observable<AccountKeys> | null = null;

  /**
   * Clears cached keys and zeroizes them.
   */
  const clearCache = (): void => {
    const currentKeys = cache$.getValue();
    if (currentKeys !== null) {
      currentKeys.clear();
      cache$.next(null);
    }
  };

  /**
   * Gets existing pending request or creates new one.
   * Uses shareReplay to share among concurrent subscribers.
   *
   * IMPORTANT: pendingRequest$ must be cleared on BOTH success AND error paths.
   * With shareReplay({ refCount: true }), if refCount goes to 0 (all subscribers unsubscribe
   * due to error) and then back to 1, the source RESTARTS. If pendingRequest$ wasn't cleared,
   * getOrCreateRequest() returns the same observable, causing requestKeys() to run again
   * which triggers duplicate auth prompts and SDK retries creating duplicate WebSockets.
   */
  const getOrCreateRequest = (): Observable<AccountKeys> => {
    if (pendingRequest$) {
      return pendingRequest$;
    }

    pendingRequest$ = defer(() => requestKeys()).pipe(
      take(1),
      tap(keys => {
        cache$.next(keys);
        access$.next(); // Start idle timer
        pendingRequest$ = null;
      }),
      catchError((error: unknown) => {
        // Clear pendingRequest$ on error to prevent refCount restart from
        // re-executing requestKeys() with the same (now-stale) observable.
        pendingRequest$ = null;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return pendingRequest$;
  };

  // keys$ checks cache first, then triggers request if needed
  const keys$: Observable<AccountKeys> = defer(() => {
    if (isDestroyed) {
      return EMPTY;
    }
    const cached = cache$.getValue();
    if (cached !== null) {
      access$.next(); // Reset idle timer
      return of(cached);
    }
    return getOrCreateRequest();
  });

  // Idle cleanup using switchMap - automatically cancels previous timer on each access
  // Subscribe immediately so idle timeout works independently of areKeysAvailable$ subscription
  const idleSubscription: Subscription = access$
    .pipe(
      switchMap(() =>
        timer(idleTimeout).pipe(
          tap(() => {
            clearCache();
          }),
        ),
      ),
    )
    .subscribe();

  const areKeysAvailable$ = cache$.pipe(
    map(keys => keys !== null),
    distinctUntilChanged(),
  );

  const destroy = (): void => {
    if (isDestroyed) return;
    isDestroyed = true;

    // Clear cached keys
    clearCache();

    // Unsubscribe from idle timer
    idleSubscription.unsubscribe();

    // Complete subjects
    access$.complete();
    cache$.complete();
  };

  return {
    keys$,
    areKeysAvailable$,
    destroy,
  };
};
