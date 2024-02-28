import { Wallet } from '@lace/cardano';
import { useCallback, useEffect, useRef } from 'react';
import { getPoolInfos } from '../../activity/PastEpochsRewards/hooks/useRewardsByEpoch';
import { useOutsideHandles } from '../../outside-handles-provider';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from '../../store';
// TODO move getPoolInfos to where it belongs (BrowsePools)

export const useRestorePoolsSelection = () => {
  const areSelectedPoolsRestored = useRef<{ restored: boolean }>({ restored: false });
  const { stakingBrowserPreferencesPersistence, walletStoreBlockchainProvider } = useOutsideHandles();

  const { portfolioMutators, selectedPortfolioStakePools } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPortfolioStakePools: store.selectedPortfolio.map(({ stakePool }) => stakePool),
    viewedStakePool: store.viewedStakePool,
  }));

  const setMissingSelectedPoolsData = useCallback(
    async (ids: string[]) => {
      try {
        const data = await getPoolInfos(
          ids.map((poolId) => Wallet.Cardano.PoolId(poolId)),
          walletStoreBlockchainProvider.stakePoolProvider
        );
        portfolioMutators.executeCommand({ data, type: 'SelectPoolFromList' });
      } catch (error) {
        console.error(error);
      }
    },
    [portfolioMutators, walletStoreBlockchainProvider.stakePoolProvider]
  );

  useEffect(() => {
    if (areSelectedPoolsRestored.current.restored) return;
    const selectedPortfolioStakePoolsId = new Set(selectedPortfolioStakePools.map(({ id }) => id.toString()));
    const selectedPoolsIdsWithNoData =
      stakingBrowserPreferencesPersistence?.selectedPoolsIds
        ?.slice(0, MAX_POOLS_COUNT)
        .filter((poolId) => !selectedPortfolioStakePoolsId.has(poolId)) || [];

    if (selectedPoolsIdsWithNoData?.length > 0) {
      setMissingSelectedPoolsData(selectedPoolsIdsWithNoData);
    }
    areSelectedPoolsRestored.current.restored = true;
  }, [
    stakingBrowserPreferencesPersistence?.selectedPoolsIds,
    selectedPortfolioStakePools,
    setMissingSelectedPoolsData,
  ]);
};
