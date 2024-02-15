import { Wallet } from '@lace/cardano';
import { getPoolInfos } from 'features/activity/PastEpochsRewards/hooks/useRewardsByEpoch';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from 'features/store';
import { useCallback, useEffect, useRef } from 'react';

export const useRestorePoolsSelection = () => {
  const areSelectedPoolsRestored = useRef<{ restored: boolean }>({ restored: false });
  const { delegationPreferencePersistence, walletStoreBlockchainProvider } = useOutsideHandles();

  const { portfolioMutators, selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
    viewedStakePool: store.viewedStakePool,
  }));

  const setMissingSelectedPoolsData = useCallback(
    async (ids: string[], viewvedPoolId?: string) => {
      const idsToFetch = ids;
      if (viewvedPoolId) {
        idsToFetch.push(viewvedPoolId);
      }
      const data = await getPoolInfos(
        ids.map((poolId) => Wallet.Cardano.PoolId(poolId)),
        walletStoreBlockchainProvider.stakePoolProvider
      );

      portfolioMutators.executeCommand({ data, type: 'SelectPoolFromList' });
      const viewvedPool = data.find(({ id }) => viewvedPoolId === id);
      if (viewvedPool) {
        portfolioMutators.executeCommand({ data: viewvedPool, type: 'ShowPoolDetailsFromList' });
      }
      areSelectedPoolsRestored.current.restored = true;
    },
    [portfolioMutators, walletStoreBlockchainProvider.stakePoolProvider]
  );

  useEffect(() => {
    if (areSelectedPoolsRestored.current.restored) return;
    const selectedPortfolioStakePoolsId = new Set(selectedPortfolioStakePools.map(({ id }) => id.toString()));
    const selectedPoolsIdsWithNoData = delegationPreferencePersistence.selectedPoolsIds
      ?.slice(0, MAX_POOLS_COUNT)
      .filter((poolId) => !selectedPortfolioStakePoolsId.has(poolId));

    if (selectedPoolsIdsWithNoData.length === 0 && !delegationPreferencePersistence.viewedStakePoolId) return;
    setMissingSelectedPoolsData(selectedPoolsIdsWithNoData, delegationPreferencePersistence.viewedStakePoolId);
  }, [
    delegationPreferencePersistence.selectedPoolsIds,
    delegationPreferencePersistence.viewedStakePoolId,
    selectedPortfolioStakePools,
    setMissingSelectedPoolsData,
  ]);
};
