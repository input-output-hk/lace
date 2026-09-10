import type { CardanoStakePoolsState } from '../slice';
import type { PersistedState } from 'redux-persist';

/**
 * Discards the cached network data written before `treasuryCut` was part of it.
 *
 * The reward calculation now needs that field; a payload without it yields
 * `NaN` for every pool at once. All three persisted keys here are caches of
 * provider responses, refetched on the next sync, so dropping the network data
 * costs a refetch and nothing else.
 *
 * The guard in `hasRateParameters` also covers this, by declining to
 * produce a figure at all. This migration is what makes the wallet stop
 * declining: without it an upgrading user shows no rates until their next
 * network-data refresh.
 */
export const dropIncompleteNetworkData = (state: PersistedState) => {
  const slice = state as (CardanoStakePoolsState & PersistedState) | undefined;
  if (!slice) return state;

  return { ...slice, networkData: {} };
};
