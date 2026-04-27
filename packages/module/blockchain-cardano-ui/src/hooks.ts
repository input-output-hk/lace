import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';
import { useEffect, useMemo } from 'react';

import type { ActionCreators, Selectors } from '.';
import type { Cardano } from '@cardano-sdk/core';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

export const useStakePool = (poolId: Cardano.PoolId | undefined) => {
  const pools = useLaceSelector('cardanoStakePools.selectActivePoolDetails');
  const loadPools = useDispatchLaceAction('cardanoStakePools.loadPools');

  useEffect(() => {
    if (poolId) loadPools([poolId]);
  }, [loadPools, poolId]);

  return useMemo(() => (poolId ? pools?.[poolId] : undefined), [poolId, pools]);
};
