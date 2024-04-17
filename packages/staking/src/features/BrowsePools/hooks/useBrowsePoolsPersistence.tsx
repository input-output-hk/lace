import { Wallet } from '@lace/cardano';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect, useMemo } from 'react';
import { DEFAULT_BROWSE_POOLS_VIEW } from '../constants';

export const useBrowsePoolsPersistence = (view: 'popup' | 'expanded') => {
  const {
    stakingBrowserPreferencesPersistence,
    setStakingBrowserPreferencesPersistence,
    walletStoreBlockchainProvider: { stakePoolProvider },
  } = useOutsideHandles();
  const { portfolioMutators, poolsView, selectedPortfolio, hydrated } = useDelegationPortfolioStore((store) => ({
    hydrated: store.hydrated,
    poolsView: store.browsePoolsView || DEFAULT_BROWSE_POOLS_VIEW,
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

    portfolioMutators.hydrate({
      poolIds: stakingBrowserPreferencesPersistence.selectedPoolIds.map((poolId) => Wallet.Cardano.PoolId(poolId)),
      poolsView,
      stakePoolProvider,
      view,
    });
  }, [
    hydrated,
    poolsView,
    portfolioMutators,
    stakePoolProvider,
    stakingBrowserPreferencesPersistence.selectedPoolIds,
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
