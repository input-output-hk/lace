import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { Err, Ok } from '@lace-lib/util';
import { EMPTY, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { unwrapProviderResult } from '../../../src/store/night-designation/unwrap-provider-result';

import type { Observable } from 'rxjs';

// The retry waits (300ms + 600ms + 1200ms) run on the TestScheduler, so the
// exhausted-retry cases cost frames rather than seconds.
const collect = <T>(
  source: Observable<T>,
): { emitted: T[]; error: unknown } => {
  const emitted: T[] = [];
  let error: unknown;
  createTestScheduler().run(() => {
    source.subscribe({
      next: value => emitted.push(value),
      error: caught => {
        error = caught;
      },
    });
  });
  return { emitted, error };
};

describe('unwrapProviderResult', () => {
  it('returns the value of a successful result', () => {
    expect(collect(unwrapProviderResult(() => of(Ok(42)))).emitted).toEqual([
      42,
    ]);
  });

  it('re-issues the request after a transient failure', () => {
    // The provider builds its observable over an already-in-flight promise,
    // which replays its settled value to every later subscriber — so a retry
    // that re-subscribed instead of re-invoking would only replay the failure.
    // The second call is what proves the request actually reached the network
    // again.
    const request = vi
      .fn()
      .mockReturnValueOnce(of(Err(new Error('provider down'))))
      .mockReturnValue(of(Ok(42)));

    expect(collect(unwrapProviderResult(request)).emitted).toEqual([42]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('gives up on a permanent failure without re-issuing the request', () => {
    const request = vi
      .fn()
      .mockReturnValue(
        of(Err(new ProviderError(ProviderFailure.BadRequest, undefined, 'no'))),
      );

    expect(collect(unwrapProviderResult(request)).error).toBeInstanceOf(Error);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('wraps a non-Error failure so the catch site can read name and message', () => {
    expect(
      collect(unwrapProviderResult(() => of(Err('plain string' as never))))
        .error,
    ).toEqual(new Error('plain string'));
  });

  it('issues four attempts in total before giving up', () => {
    // Pins the budget, not just the fact that some retry happens: the script
    // address is paginated, so each extra attempt is a fresh burst of requests
    // against a shared rate limiter.
    const request = vi
      .fn()
      .mockReturnValue(of(Err(new Error('provider down'))));

    expect(collect(unwrapProviderResult(request)).error).toBeInstanceOf(Error);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('surfaces the original provider error once the retries are exhausted', () => {
    // The build maps failures onto i18n keys by inspecting the error, so an
    // exhausted retry must not replace it with a generic timeout/retry error.
    const original = new ProviderError(
      ProviderFailure.ServerUnavailable,
      undefined,
      'upstream is down',
    );

    expect(collect(unwrapProviderResult(() => of(Err(original)))).error).toBe(
      original,
    );
  });

  it('fails the read when the provider completes without answering', () => {
    // Not an empty success: a `forkJoin` gathering this alongside another read
    // would otherwise never emit, leaving the entry refreshing forever.
    expect(collect(unwrapProviderResult(() => EMPTY)).error).toBeInstanceOf(
      Error,
    );
  });
});
