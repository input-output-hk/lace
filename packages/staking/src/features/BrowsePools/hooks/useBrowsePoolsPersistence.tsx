import { Wallet } from '@lace/cardano';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect, useMemo } from 'react';

export const useBrowsePoolsPersistence = (view: 'popup' | 'expanded') => {
  const {
    stakingBrowserPreferencesPersistence,
    setStakingBrowserPreferencesPersistence,
    walletStoreBlockchainProvider: { stakePoolProvider },
  } = useOutsideHandles();
  const { portfolioMutators, poolsView, selectedPortfolio, hydrated } = useDelegationPortfolioStore((store) => ({
    hydrated: store.hydrated,
    poolsView: store.browsePoolsView,
    portfolioMutators: store.mutators,
    selectedPortfolio: store.selectedPortfolio,
  }));
  const selectedPoolIds = useMemo(
    () => selectedPortfolio.map(({ stakePool }) => stakePool.id.toString()),
    [selectedPortfolio]
  );

  // LocalStorage -> Store (hydration)
  useEffect(() => {
    if (hydrated) return;

    try {
      portfolioMutators.hydrate({
        poolIds:
          stakingBrowserPreferencesPersistence?.selectedPoolIds.map((poolId) => Wallet.Cardano.PoolId(poolId)) ?? [],
        poolsView: stakingBrowserPreferencesPersistence.poolsView,
        stakePoolProvider,
        view,
      });
    } catch {
      console.error('error during store hydration');
    }
  }, [
    hydrated,
    poolsView,
    portfolioMutators,
    stakePoolProvider,
    stakingBrowserPreferencesPersistence.poolsView,
    stakingBrowserPreferencesPersistence?.selectedPoolIds,
    view,
  ]);

  // Store -> LocalStorage
  useEffect(() => {
    if (!hydrated) return;
    setStakingBrowserPreferencesPersistence({
      poolsView,
      selectedPoolIds,
    });
  }, [hydrated, poolsView, selectedPoolIds, setStakingBrowserPreferencesPersistence]);
};
