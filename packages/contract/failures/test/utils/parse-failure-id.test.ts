import { describe, expect, it } from 'vitest';

import { parseFailureId } from '../../src/utils/parse-failure-id';
import { FailureId } from '../../src/value-objects';

describe('parseFailureId', () => {
  it('extracts blockchain and category from a known-blockchain failure id', () => {
    expect(parseFailureId(FailureId('cardano-sync-account-0-mainnet'))).toEqual(
      {
        blockchain: 'Cardano',
        category: 'sync',
      },
    );
    expect(parseFailureId(FailureId('midnight-wallet-wallet123'))).toEqual({
      blockchain: 'Midnight',
      category: 'wallet',
    });
    expect(parseFailureId(FailureId('bitcoin-tx-tx-id-here'))).toEqual({
      blockchain: 'Bitcoin',
      category: 'tx',
    });
  });

  it('returns empty object when the first segment is not a known blockchain', () => {
    expect(parseFailureId(FailureId('unknown-something-rest'))).toEqual({});
    expect(parseFailureId(FailureId('dapp-auth-something'))).toEqual({});
    expect(parseFailureId(FailureId('hw-connection-failed'))).toEqual({});
  });

  it('returns empty object when the failure id has fewer than three segments', () => {
    expect(parseFailureId(FailureId('cardano-sync'))).toEqual({});
    expect(parseFailureId(FailureId('cardano'))).toEqual({});
    expect(parseFailureId(FailureId(''))).toEqual({});
  });
});
