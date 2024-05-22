import { Wallet } from '@lace/cardano';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect, useMemo, useState } from 'react';

export const useBrowsePoolsPersistence = (view: 'popup' | 'expanded') => {
  const [hydrated, setHydrated] = useState(false);
  const {
    stakingBrowserPreferencesPersistence,
    setStakingBrowserPreferencesPersistence,
    walletStoreBlockchainProvider: { stakePoolProvider },
  } = useOutsideHandles();
  const { portfolioMutators, poolsView, selectedPortfolio } = useDelegationPortfolioStore((store) => ({
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
      setHydrated(true);
    } catch {
      console.error('error during store hydration');
    }
  }, [
    hydrated,
    poolsView,
    portfolioMutators,
    stakePoolProvider,
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
