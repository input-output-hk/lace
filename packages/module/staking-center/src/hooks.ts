import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createContextualUseLoadModules,
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import { useEffect, useMemo, useState } from 'react';

import { estimateROS } from './utils';
import { fuseSearch } from './utils/fuseSearch';

import type { ActionCreators, AvailableAddons, Selectors } from './index';
import type { Cardano } from '@cardano-sdk/core';
import type { RewardAccountInfo } from '@lace-contract/cardano-context';
import type { LaceStakePool } from '@lace-contract/cardano-stake-pools';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();

/**
 * Determines if the de-register button should be disabled.
 * Disabled when user is locked (no DRep delegation) AND has unclaimed rewards.
 */
export const useIsDeregisterDisabled = (
  rewardAccountInfo: RewardAccountInfo | undefined,
): boolean => {
  return useMemo(() => {
    const isLocked = !rewardAccountInfo?.drepId;
    const hasUnclaimedRewards = rewardAccountInfo?.withdrawableAmount
      ? BigNumber.valueOf(rewardAccountInfo.withdrawableAmount) > 0n
      : false;
    return isLocked && hasUnclaimedRewards;
  }, [rewardAccountInfo?.drepId, rewardAccountInfo?.withdrawableAmount]);
};

export const useStakePools = (
  query: Cardano.PoolId | Cardano.PoolId[] | undefined,
  withROS?: boolean,
): (LaceStakePool | undefined)[] => {
  const pools = useLaceSelector('cardanoStakePools.selectActivePoolDetails');
  const data = useLaceSelector('cardanoStakePools.selectActiveNetworkData');
  const loadPools = useDispatchLaceAction('cardanoStakePools.loadPools');

  useEffect(() => {
    if (query) loadPools(Array.isArray(query) ? query : [query]);
  }, [loadPools, query]);

  return useMemo(() => {
    if (!pools || !query) return [];

    const poolIds = Array.isArray(query) ? query : [query];

    if (!withROS) return poolIds.map(poolId => pools[poolId]);
    if (!data) return [];

    return poolIds.map(poolId => estimateROS(pools[poolId], data));
  }, [data, pools, query, withROS]);
};

export const useSearchStakePools = (query: string) => {
  const [fuseState, setFuseState] = useState(fuseSearch.fuse$.getValue());
  const { isLoading, pools, search, totalPoolsCount } = fuseState;

  useEffect(() => {
    const subscription = fuseSearch.fuse$.subscribe(setFuseState);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({
      isLoading,
      pools: isLoading || query === '' ? pools : search(query),
      totalPoolsCount,
    }),
    [isLoading, pools, query, search, totalPoolsCount],
  );
};
