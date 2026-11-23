import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactionFee } from '../../src/store/fetch-transaction-fee';

const hash = 'a'.repeat(64);
const transaction = (fee: unknown, txHash = hash) => ({
  __typename: 'RegularTransaction',
  hash: txHash,
  fees: { paidFees: fee },
});
const respond = (transactions: unknown[]) => {
  const fetch = vi.fn(async () =>
    Promise.resolve(
      new Response(JSON.stringify({ data: { transactions } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
afterEach(() => vi.unstubAllGlobals());

describe('consented fee metadata transport', () => {
  it('requests the exact hash from the configured endpoint and preserves zero', async () => {
    const fetch = respond([transaction('0')]);
    expect(
      await firstValueFrom(
        fetchTransactionFee(
          'https://indexer.example.test/graphql?project_id=test',
          hash,
        ),
      ),
    ).toBe('0');
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(request[0])).toBe(
      'https://indexer.example.test/graphql?project_id=test',
    );
    expect(JSON.parse(request[1].body as string)).toMatchObject({
      variables: { transactionHash: hash },
    });
  });
  it.each(
    [
      [],
      [transaction('7', 'b'.repeat(64))],
      [transaction(undefined)],
      [transaction('-1')],
      [transaction('1.5')],
      [transaction(7)],
      [{ __typename: 'SystemTransaction', hash }],
    ].map(transactions => [transactions]),
  )('does not fabricate a fee from %j', async transactions => {
    respond(transactions);
    expect(
      await firstValueFrom(
        fetchTransactionFee('https://indexer.example.test', hash),
      ),
    ).toBeUndefined();
  });
  it('aborts the HTTP request when unsubscribed', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, options: RequestInit) => {
        signal = options.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        });
      }),
    );
    const subscription = fetchTransactionFee(
      'https://indexer.example.test',
      hash,
    ).subscribe();
    await vi.waitFor(() => {
      expect(signal).toBeDefined();
    });
    subscription.unsubscribe();
    await vi.waitFor(() => {
      expect(signal?.aborted).toBe(true);
    });
  });
  it('surfaces provider errors without including credentials or hashes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('private endpoint'))),
    );
    await expect(
      firstValueFrom(fetchTransactionFee('https://indexer.example.test', hash)),
    ).rejects.toThrow('Transaction fee lookup failed');
  });
});
