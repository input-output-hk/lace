import {
  isReduxPersistState,
  type LaceInit,
  type LaceModuleStoreInit,
  type PersistedStateProperty,
} from '@lace-contract/module';
import { AccountId } from '@lace-contract/wallet-repo';
import { createTransform } from 'redux-persist';

import { realfiStakingSideEffects } from './side-effects';
import { realfiStakingReducers, type RealFiStakingStoreState } from './slice';

type PositionState = RealFiStakingStoreState['realfiPosition'];

/**
 * Strip transient warmup/cooldown pending-operation entries from persisted
 * positions (per docs/redux-persistence.md). `lastSuccessfulSync` + balances
 * are persisted; `pendingStake` / `pendingUnstake` are refetched on next sync.
 */
export const realfiPositionTransform = createTransform<
  PersistedStateProperty<PositionState>,
  PersistedStateProperty<PositionState>
>((inboundState, key) => {
  if (isReduxPersistState(key, inboundState)) {
    return inboundState;
  }

  if (key === 'positionsByAccount') {
    const inbound = inboundState as PositionState['positionsByAccount'];
    const outbound: PositionState['positionsByAccount'] = {};
    for (const accountId in inbound) {
      const position = inbound[AccountId(accountId)];
      outbound[AccountId(accountId)] = {
        ...position,
        pendingStake: undefined,
        pendingUnstake: undefined,
      };
    }
    return outbound;
  }

  return inboundState;
});

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: realfiStakingReducers,
  sideEffects: realfiStakingSideEffects,
  persistConfig: {
    realfiPosition: {
      version: 1,
      // withdrawnActivitiesByAccount is persisted: a completed claim can't be
      // re-derived from a read, so the optimistic row must survive reloads.
      whitelist: [
        'positionsByAccount',
        'yieldInfoByNetwork',
        // The Total Earned cost basis must survive reloads — losing it resets
        // earnings to zero (it is the first-ever observed rate).
        'earnBasisRateByNetwork',
        'withdrawnActivitiesByAccount',
        // Persisted so the Staking Activities list rehydrates with the
        // last-known history on return instead of flashing the empty state;
        // the on-mount read refreshes it. Per-account (network-specific, ADR-11)
        // and REPLACED per fetch, so it stays bounded by the paginated read.
        'stakeActivitiesByAccount',
        // Watched order submits must survive reloads: the feed outage they
        // detect outlives the session, and the record can't be re-derived.
        // Bounded by max-age eviction on record.
        'submittedOrderTxsByAccount',
        'hasSeenOnboarding',
        // Cached R-Points snapshot (LW-15495): persisted so the card renders
        // the last-known balance instantly while the on-focus refetch runs.
        'rPointsByAccount',
        // The locally-consumed bonus flag (LW-15495): persisted because the
        // backend-indexing window it covers can span a restart.
        'laceBonusConsumedByAccount',
      ],
      transforms: [realfiPositionTransform],
    },
    // realfiFlow: NOT persisted (transient state machine)
  },
});

export default store;
