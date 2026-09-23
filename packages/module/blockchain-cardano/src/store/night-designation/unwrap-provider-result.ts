import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { defer, first, map } from 'rxjs';

import type { ProviderError } from '@cardano-sdk/core';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

/**
 * Take the single value a `CardanoProvider` call emits, turning a failed
 * `Result` into a thrown error so the designation side-effects can gather
 * their reads and catch every failure in one place. Transient failures are
 * retried first (ADR 15 tier-1).
 *
 * Observable rather than `Promise`: `retryBackoff`'s waits are only virtual
 * while they stay on a scheduler the `TestScheduler` can drive, and a promise
 * anywhere in a side-effect's pipeline forfeits marble testing for the whole
 * of it (docs/rxjs-guidelines.md). A promise-shaped caller wraps this in
 * `firstValueFrom`; a side-effect composes it.
 *
 * Takes a request FACTORY, not an observable: the provider builds its
 * observable over an already-in-flight promise, which replays its settled
 * value to every later subscriber — so a retry that re-subscribed would
 * replay the same failure instead of reaching the network. The factory is a
 * caller-side stand-in for a cold provider method; drop it, and take the
 * observable directly, once every method this calls mints its promise on
 * subscribe.
 *
 * A provider that rejects with a non-`Error` is wrapped rather than thrown
 * as-is, so the catch site can always read `.name` / `.message`.
 */
export const unwrapProviderResult = <T>(
  request: () => Observable<Result<T, ProviderError>>,
): Observable<T> =>
  defer(request).pipe(
    map(result => {
      if (!result.isOk()) {
        throw result.error instanceof Error
          ? result.error
          : new Error(String(result.error));
      }
      return result.value;
    }),
    retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    // A provider that completes without answering is a failed read, not an
    // empty one — `first` errors where a bare `take(1)` would complete and
    // leave a `forkJoin` above it silently never emitting.
    first(),
  );
