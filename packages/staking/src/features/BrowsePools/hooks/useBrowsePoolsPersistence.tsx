import { Wallet } from '@lace/cardano';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_BROWSE_POOLS_VIEW } from '../constants';
import { getPoolInfos } from '../queries';

export const useBrowsePoolsPersistence = () => {
  const storeHydrated = useRef(false);
  const {
    stakingBrowserPreferencesPersistence,
    setStakingBrowserPreferencesPersistence,
    walletStoreBlockchainProvider: { stakePoolProvider },
  } = useOutsideHandles();
  const { portfolioMutators, poolsView, selectedPortfolio, storeReady } = useDelegationPortfolioStore((store) => ({
    poolsView: store.browsePoolsView || DEFAULT_BROWSE_POOLS_VIEW,
    portfolioMutators: store.mutators,
    selectedPortfolio: store.selectedPortfolio,
    storeReady: !!store.view,
  }));
  const selectedPoolIds = useMemo(
    () => selectedPortfolio.map(({ stakePool }) => stakePool.id.toString()),
    [selectedPortfolio]
  );

  // LocalStorage -> Store (hydration)
  useEffect(() => {
    if (!storeReady || storeHydrated.current) return;

    if (stakingBrowserPreferencesPersistence) {
      // eslint-disable-next-line promise/catch-or-return
      getPoolInfos({
        poolIds: stakingBrowserPreferencesPersistence.selectedPoolIds.map((poolId) => Wallet.Cardano.PoolId(poolId)),
        preserveOrder: true,
        stakePoolProvider,
        status: [
          Wallet.Cardano.StakePoolStatus.Activating,
          Wallet.Cardano.StakePoolStatus.Active,
          Wallet.Cardano.StakePoolStatus.Retiring,
        ],
      }).then((selectedStakePools) => {
        // TODO add a common store hydration command; https://input-output.atlassian.net/browse/LW-9979
        portfolioMutators.executeCommand({ data: selectedStakePools, type: 'SelectPoolFromList' });
        portfolioMutators.executeCommand({
          data: stakingBrowserPreferencesPersistence.poolsView,
          type: 'SetBrowsePoolsView',
        });
        storeHydrated.current = true;
      });
    } else {
      storeHydrated.current = true;
    }
  }, [storeReady, portfolioMutators, stakePoolProvider, stakingBrowserPreferencesPersistence]);

  // Store -> LocalStorage
  useEffect(() => {
    if (!storeHydrated.current) return;
    setStakingBrowserPreferencesPersistence({
      poolsView,
      selectedPoolIds,
    });
  }, [setStakingBrowserPreferencesPersistence, poolsView, stakingBrowserPreferencesPersistence, selectedPoolIds]);
};
