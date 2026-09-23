import { retryBackoff } from 'backoff-rxjs';
import { defer, from } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  measureRequestsUnderRetry,
  PERMANENT_STATUS,
  RETRIABLE_STATUS,
} from '../src/measure-requests-under-retry';

import type { RetryBackoffConfig } from 'backoff-rxjs';

const ENDPOINT = 'txs/abc/utxos';

/** The production retry, restated here so `util-dev` stays free of provider deps. */
const RETRY: RetryBackoffConfig = {
  initialInterval: 300,
  maxInterval: 5000,
  maxRetries: 3,
  shouldRetry: (error: unknown) =>
    (error as { retriable?: boolean }).retriable === true,
};

/** A provider method: it folds its outcome into a `Result` rather than erroring. */
const provider = (outcome: 'permanent' | 'retriable' | 'success') => {
  const issued: string[] = [];
  const call = async () => {
    issued.push(ENDPOINT);
    const error = { retriable: outcome === 'retriable' };
    return {
      isErr: () => outcome !== 'success',
      unwrap: () => null,
      unwrapErr: () => error,
    };
  };
  return { issued, call };
};

describe('measureRequestsUnderRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports one request per retry attempt for a cold call', async () => {
    const { issued, call } = provider('retriable');

    const attempts = await measureRequestsUnderRetry({
      call: () => defer(call),
      requests: () => issued,
      retry: RETRY,
    });

    expect(attempts).toEqual(Array.from({ length: 4 }, () => ENDPOINT));
  });

  it('reports every attempt when the transport takes time of its own', async () => {
    const issued: string[] = [];
    const call = async () => {
      issued.push(ENDPOINT);
      await new Promise(resolve => {
        setTimeout(resolve, 200);
      });
      return {
        isErr: () => true,
        unwrap: () => null,
        unwrapErr: () => ({ retriable: true }),
      };
    };

    const attempts = await measureRequestsUnderRetry({
      call: () => defer(call),
      requests: () => issued,
      retry: RETRY,
    });

    expect(attempts).toEqual(Array.from({ length: 4 }, () => ENDPOINT));
  });

  it('reports a single request for a hot call, which is the bug it detects', async () => {
    const { issued, call } = provider('retriable');

    const attempts = await measureRequestsUnderRetry({
      call: () => from(call()),
      requests: () => issued,
      retry: RETRY,
    });

    expect(attempts).toEqual([ENDPOINT]);
  });

  it('reports a single request when the failure is permanent', async () => {
    const { issued, call } = provider('permanent');

    const attempts = await measureRequestsUnderRetry({
      call: () => defer(call),
      requests: () => issued,
      retry: RETRY,
    });

    expect(attempts).toEqual([ENDPOINT]);
  });

  it('reports a single request when the call succeeds', async () => {
    const { issued, call } = provider('success');

    const attempts = await measureRequestsUnderRetry({
      call: () => defer(call),
      requests: () => issued,
      retry: RETRY,
    });

    expect(attempts).toEqual([ENDPOINT]);
  });

  it('would report one request without its unwrap, however cold the call is', async () => {
    const { issued, call } = provider('retriable');

    const settled = new Promise<void>(resolve => {
      defer(call)
        .pipe(retryBackoff(RETRY))
        .subscribe({
          next: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
          complete: () => {
            resolve();
          },
        });
    });
    await vi.advanceTimersByTimeAsync(RETRY.initialInterval * 8);
    await settled;

    expect(issued).toEqual([ENDPOINT]);
  });

  it('names a retriable and a permanent status the providers agree on', async () => {
    expect(RETRIABLE_STATUS).toBe(500);
    expect(PERMANENT_STATUS).toBe(403);
  });
});
