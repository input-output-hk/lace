import { AccountId } from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { describe, expect, it } from 'vitest';

import { stubAccountUtxoCacheKeys } from '../../../src/store/migrations/5-stub-account-utxo-cache-keys';
import { UtxoCacheKey } from '../../../src/value-objects';
import { utxo1, utxo2 } from '../../mocks';

import type { CardanoContextSliceState } from '../../../src/store/slice';

describe('stubAccountUtxoCacheKeys', () => {
  it('wraps each pre-v5 entry in { utxos, cacheKey: stub }', () => {
    const accountId1 = AccountId('accountId1');
    const accountId2 = AccountId('accountId2');
    const utxos1 = Serializable.to([utxo1]);
    const utxos2 = Serializable.to([utxo2]);

    const state = {
      accountUtxos: {
        [accountId1]: utxos1,
        [accountId2]: utxos2,
      },
    } as unknown as CardanoContextSliceState;

    const result = stubAccountUtxoCacheKeys(
      state as never,
    ) as CardanoContextSliceState;

    expect(Object.keys(result.accountUtxos)).toEqual([accountId1, accountId2]);
    expect(result.accountUtxos[accountId1]?.utxos).toBe(utxos1);
    expect(result.accountUtxos[accountId2]?.utxos).toBe(utxos2);
    // both entries carry the same stub key
    const stub = result.accountUtxos[accountId1]?.cacheKey;
    expect(stub).toBeDefined();
    expect(result.accountUtxos[accountId2]?.cacheKey).toBe(stub);
  });

  it('produces empty accountUtxos when none persisted', () => {
    const result = stubAccountUtxoCacheKeys(
      {} as never,
    ) as CardanoContextSliceState;
    expect(result.accountUtxos).toEqual({});
  });

  it('stub cache key differs from every real cache key', () => {
    const state = {
      accountUtxos: { [AccountId('accountId1')]: Serializable.to([utxo1]) },
    } as unknown as CardanoContextSliceState;

    const result = stubAccountUtxoCacheKeys(
      state as never,
    ) as CardanoContextSliceState;
    const stub = result.accountUtxos[AccountId('accountId1')]?.cacheKey;

    const realWithoutStake = UtxoCacheKey({
      topOnChainActivityId:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      stakeKeys: [],
      accountAddressCount: 0,
    });
    expect(stub).not.toBe(realWithoutStake);
  });
});
