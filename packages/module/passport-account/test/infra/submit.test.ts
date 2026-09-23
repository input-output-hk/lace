import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertSubmitted,
  submitTx,
  submitWithDustRetry,
} from '../../src/infra/submit';

import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

describe('submitWithDustRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the submission result without waiting when the first attempt succeeds', async () => {
    const submit = vi.fn(async () => 'tx-id');

    await expect(submitWithDustRetry(submit)).resolves.toBe('tx-id');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    'SubmissionError: transaction rejected',
    'node said: Invalid Transaction',
    'DustDoubleSpend',
    'dust actions NotNormalized',
  ])('retries after 10s when the node rejects with "%s"', async message => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error(message))
      .mockResolvedValueOnce('tx-id');

    const result = submitWithDustRetry(submit);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe('tx-id');
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('matches the pattern against the error name too', async () => {
    const rejection = new Error('rejected');
    rejection.name = 'SubmissionError';
    const submit = vi
      .fn()
      .mockRejectedValueOnce(rejection)
      .mockResolvedValueOnce('tx-id');

    const result = submitWithDustRetry(submit);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe('tx-id');
  });

  it('matches non-Error rejections by their string form', async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce('DustDoubleSpend')
      .mockResolvedValueOnce('tx-id');

    const result = submitWithDustRetry(submit);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe('tx-id');
  });

  it('does not retry errors outside the dust-race patterns', async () => {
    const submit = vi.fn(async () => {
      throw new Error('ttl expired');
    });

    await expect(submitWithDustRetry(submit)).rejects.toThrow('ttl expired');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('gives up after three retries on a persistent dust race', async () => {
    const submit = vi.fn(async () => {
      throw new Error('DustDoubleSpend');
    });

    const result = submitWithDustRetry(submit);
    const assertion = expect(result).rejects.toThrow('DustDoubleSpend');
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
    expect(submit).toHaveBeenCalledTimes(4);
  });

  it('honours an injected sleep and retry budget', async () => {
    const sleep = vi.fn(async () => undefined);
    const submit = vi.fn(async () => {
      throw new Error('NotNormalized');
    });

    await expect(
      submitWithDustRetry(submit, { sleep, maxRetries: 1, retryDelayMs: 250 }),
    ).rejects.toThrow('NotNormalized');
    expect(submit).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(250);
  });

  it('does not resubmit a transaction that landed with a failing status', async () => {
    const submit = vi.fn(async () => {
      assertSubmitted('Call to add_device_with_jubjub', {
        status: 'FailEntirely',
      });
    });

    await expect(submitWithDustRetry(submit)).rejects.toThrow(
      'Call to add_device_with_jubjub failed: "FailEntirely"',
    );
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('does not resubmit a finalized verdict whose message quotes a dust race', async () => {
    const failed = Object.assign(new Error('Invalid Transaction'), {
      finalizedTxData: { status: 'FailEntirely' },
    });
    const submit = vi.fn(async () => {
      throw failed;
    });

    await expect(submitWithDustRetry(submit)).rejects.toBe(failed);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe('assertSubmitted', () => {
  const assert = (label: string, finalized: unknown) => () => {
    assertSubmitted(label, finalized);
  };

  it.each(['FailEntirely', 'FailFallible'])(
    'throws on the %s status',
    status => {
      expect(assert('Account deploy', { status })).toThrow(
        `Account deploy failed: "${status}"`,
      );
    },
  );

  it('passes a successful status', () => {
    expect(
      assert('Account deploy', { status: 'SucceedEntirely' }),
    ).not.toThrow();
  });

  it('reads the status a circuit call nests under its public data', () => {
    expect(
      assert('Call to add_device_with_jubjub', {
        public: { status: 'FailFallible' },
      }),
    ).toThrow('Call to add_device_with_jubjub failed: "FailFallible"');
    expect(
      assert('Call to add_device_with_jubjub', {
        public: { status: 'SucceedEntirely' },
      }),
    ).not.toThrow();
  });

  it.each([
    ['no status field', { txId: 'tx-id' }],
    ['an undefined status', { status: undefined }],
    ['no finalized data at all', undefined],
  ])('accepts a submission result with %s', (_label, finalized) => {
    expect(assert('Account deploy', finalized)).not.toThrow();
  });
});

describe('submitTx', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const finalized = { txHash: 'hash' } as unknown as FinalizedTxData;
  const providers = { publicDataProvider: 'providers' };
  const options = { unprovenTx: 'tx', circuitId: 'activate_with_jubjub' };

  it('passes the providers and options through to the injected submitter', async () => {
    const submit = vi.fn(async () => finalized);

    const result = await submitTx(providers, options, { submit });

    expect(result).toBe(finalized);
    expect(submit).toHaveBeenCalledExactlyOnceWith(providers, options);
  });

  it('resubmits on a dust-race rejection', async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('SubmissionError: DustDoubleSpend'))
      .mockResolvedValueOnce(finalized);

    const result = submitTx(providers, options, { submit });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe(finalized);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('surfaces a non-retryable submission failure', async () => {
    const submit = vi.fn(async () => {
      throw new Error('proof verification failed');
    });

    await expect(submitTx(providers, options, { submit })).rejects.toThrow(
      'proof verification failed',
    );
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
