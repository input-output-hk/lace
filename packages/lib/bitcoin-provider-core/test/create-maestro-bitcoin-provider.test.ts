import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import {
  BitcoinFeeEstimationMode,
  BitcoinNetwork,
} from '@lace-contract/bitcoin-context';
import { Milliseconds } from '@lace-lib/util';
import { isRetriableError } from '@lace-lib/util-provider';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import { createMaestroBitcoinProvider } from '../src';

import type { MaestroConfig } from '../src';
import type {
  BitcoinProvider,
  BitcoinProviderContext,
} from '@lace-contract/bitcoin-context';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

const TX_HASH = 'aa'.repeat(32);
const ADDRESS = 'bc1qexampleaddress';
const RAW_TX = 'deadbeef';

const MAESTRO_CONFIG: MaestroConfig = {
  clientConfig: { baseUrl: 'https://maestro.invalid', projectId: 'key' },
  rateLimiterConfig: {
    size: 1,
    increaseAmount: 1,
    increaseInterval: Milliseconds(1000),
  },
};

const reads: [
  string,
  (
    provider: BitcoinProvider,
    context: BitcoinProviderContext,
  ) => Observable<Result<unknown, ProviderError>>,
][] = [
  [
    'getLastKnownBlock',
    (provider, context) => provider.getLastKnownBlock(context),
  ],
  [
    'getTransaction',
    (provider, context) => provider.getTransaction(context, TX_HASH),
  ],
  [
    'getRawTransaction',
    (provider, context) => provider.getRawTransaction(context, TX_HASH),
  ],
  [
    'getTransactions',
    (provider, context) => provider.getTransactions(context, ADDRESS, {}),
  ],
  [
    'getTransactionsInMempool',
    (provider, context) =>
      provider.getTransactionsInMempool(context, ADDRESS, {}),
  ],
  ['getUTxOs', (provider, context) => provider.getUTxOs(context, ADDRESS, {})],
  [
    'submitTransaction',
    (provider, context) => provider.submitTransaction(context, RAW_TX),
  ],
  [
    'getTransactionStatus',
    (provider, context) => provider.getTransactionStatus(context, TX_HASH),
  ],
  [
    'estimateFee',
    (provider, context) =>
      provider.estimateFee(context, 1, BitcoinFeeEstimationMode.Economical),
  ],
];

const firstEmission = (
  source: Observable<Result<unknown, ProviderError>>,
): Result<unknown, ProviderError> | undefined => {
  let result: Result<unknown, ProviderError> | undefined;
  source.subscribe(value => {
    result = value;
  });
  return result;
};

describe('createMaestroBitcoinProvider', () => {
  describe('unprovisioned network', () => {
    const provider = createMaestroBitcoinProvider({}, dummyLogger);
    const context: BitcoinProviderContext = { network: BitcoinNetwork.Mainnet };

    it.each(reads)(
      '%s emits an immediate non-retriable Err instead of throwing',
      (_method, read) => {
        // A synchronous emission proves the guard short-circuited before any
        // maestro client was built: a real request only emits on a later tick.
        const result = firstEmission(read(provider, context));

        expect(result).toBeDefined();
        if (!result) throw new Error('expected a synchronous emission');
        if (result.isOk()) throw new Error('expected Err');
        expect(result.error).toBeInstanceOf(ProviderError);
        expect(result.error.reason).toBe(ProviderFailure.NotImplemented);
        expect(isRetriableError(result.error)).toBe(false);
      },
    );
  });

  it('names the requested network — a config for another network does not satisfy the lookup', () => {
    const provider = createMaestroBitcoinProvider(
      { [BitcoinNetwork.Testnet]: MAESTRO_CONFIG },
      dummyLogger,
    );

    const result = firstEmission(
      provider.getLastKnownBlock({ network: BitcoinNetwork.Mainnet }),
    );

    if (!result || result.isOk()) throw new Error('expected Err');
    expect(result.error.message).toContain(
      `maestro is unprovisioned for network ${BitcoinNetwork.Mainnet}`,
    );
  });
});
