import { retryBackoff } from 'backoff-rxjs';
import { firstValueFrom, map } from 'rxjs';
import { vi } from 'vitest';

import type { RetryBackoffConfig } from 'backoff-rxjs';
import type { Observable } from 'rxjs';

/** 500 maps to `Unhealthy`, the failure `isRetriableError` retries. */
export const RETRIABLE_STATUS = 500;

/**
 * 403 maps to `Forbidden`. NOT 404: the input resolver and the rewards provider
 * both turn a 404 into a success, so it never reaches the retry to be judged.
 */
export const PERMANENT_STATUS = 403;

/** The `Result` shape provider methods emit, structurally — see `@lace-lib/util`. */
type UnwrappableResult<T> = {
  isErr: () => boolean;
  unwrap: () => T;
  unwrapErr: () => unknown;
};

type MeasureRequestsUnderRetryParams<T> = {
  /** The provider call under test, made exactly as a production caller makes it. */
  call: () => Observable<UnwrappableResult<T>>;
  /** Every request the transport has issued so far, most recent last. */
  requests: () => readonly string[];
  /**
   * The retry the production caller wraps this call in — pass
   * `PROVIDER_REQUEST_RETRY_CONFIG`, so the measurement counts the attempts the
   * wallet really makes rather than a number invented by the test.
   */
  retry: RetryBackoffConfig;
};

/**
 * The requests one provider call issues while `retry` drives it to exhaustion,
 * in order: one per attempt when the call is cold, one in total when it is not.
 * The order matters — a bare count cannot tell a retried first page from a
 * walked pagination.
 *
 * Requires `vi.useFakeTimers()`.
 *
 * Measure through this rather than by hand: a hand-rolled measurement reports
 * one request for correct code in three separate ways — without an unwrap
 * beneath the retry, which never fires because provider failures are `Err`
 * VALUES; without draining the timers ASYNCHRONOUSLY; and with a failure the
 * retry classifies as permanent (see `RETRIABLE_STATUS`).
 */
export const measureRequestsUnderRetry = async <T>({
  call,
  requests,
  retry,
}: MeasureRequestsUnderRetryParams<T>): Promise<string[]> => {
  const before = requests().length;

  const settled = firstValueFrom(
    call().pipe(
      map(result => {
        if (result.isErr()) throw result.unwrapErr();
        return result.unwrap();
      }),
      retryBackoff(retry),
    ),
  ).catch(() => undefined);

  // Drains the queue rather than a computed window: a window would have to know
  // both the backoff schedule and however long the call itself waits, so any
  // fixture with latency of its own would outrun it and hang.
  await vi.runAllTimersAsync();
  await settled;

  return [...requests()].slice(before);
};
