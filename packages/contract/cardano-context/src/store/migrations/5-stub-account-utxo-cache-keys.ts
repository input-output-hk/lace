import { UtxoCacheKey } from '../../value-objects';

import type { AccountUtxoEntry, CardanoContextSliceState } from '../slice';
import type { Cardano } from '@cardano-sdk/core';
import type { PersistedState } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Serializable } from '@lace-lib/util-store';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

/**
 * Real `topOnChainActivityId` values are Cardano transaction hashes
 * (64-char hex), so this literal can never equal one — the first real
 * cache key computed for the account differs and forces a refetch.
 */
const MIGRATION_STUB_ACTIVITY_ID = 'pre-v5-migration';

/**
 * Migration 5: UTxO entries used to be persisted as `Serializable<Utxo[]>`
 * keyed by account id, with the cache key stored separately. v5 folds both
 * together into `AccountUtxoEntry`. Each pre-v5 entry is wrapped with a
 * stub cache key so the app can keep rendering the balance immediately
 * after upgrade; the stub differs from every real cache key, so the
 * natural trigger forces a refetch as soon as activities and addresses
 * emit.
 */
export const stubAccountUtxoCacheKeys = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<CardanoContextSliceState>;
  const previous = typedState.accountUtxos as unknown as
    | Partial<Record<AccountId, Serializable<Cardano.Utxo[]>>>
    | undefined;
  const stubCacheKey = UtxoCacheKey({
    topOnChainActivityId: MIGRATION_STUB_ACTIVITY_ID,
    stakeKeys: [],
    accountAddressCount: 0,
  });
  const next: Partial<Record<AccountId, AccountUtxoEntry>> = {};
  if (previous) {
    for (const accountId in previous) {
      const utxos = previous[accountId as AccountId];
      if (utxos) {
        next[accountId as AccountId] = { utxos, cacheKey: stubCacheKey };
      }
    }
  }
  typedState.accountUtxos = next;
  return typedState;
};
