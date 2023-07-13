import { StakePoolItemBrowserProps, Wallet } from '@lace/cardano';
import { useEffect, useMemo } from 'react';
import { StateStatus, useOutsideHandles } from '../outside-handles-provider';
import { useStakePoolDetails } from '../store';
import { StakePoolsTable } from './stake-pools-table';

const LACE_APP_ID = 'lace-app';

type BrowsePoolsProps = {
  onStake: (id: StakePoolItemBrowserProps['id']) => void;
};

export const BrowsePools = ({ onStake }: BrowsePoolsProps) => {
  const { setIsDrawerVisible } = useStakePoolDetails();

  const {
    walletStoreStakePoolSearchResults: stakePoolSearchResults,
    walletStoreStakePoolSearchResultsStatus: stakePoolSearchResultsStatus,
    walletStoreFetchStakePools: fetchStakePools,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
    walletStoreNetworkInfo: networkInfo,
    walletStoreGetKeyAgentType: getKeyAgentType,
  } = useOutsideHandles();

  const isSearching = stakePoolSearchResultsStatus === StateStatus.LOADING;

  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);

  useEffect(() => {
    const fetchSelectedStakePool = async () => {
      if (isInMemory || !networkInfo) return;
      const stakePoolId = localStorage.getItem('TEMP_POOLID');
      if (!stakePoolId) return;
      const searchString = String(stakePoolId);
      await fetchStakePools({ searchString });
      const foundStakePool = stakePoolSearchResults.pageResults.find(
        (pool: Wallet.Cardano.StakePool) => pool?.id?.toString() === stakePoolId
      );
      if (!foundStakePool) return;
      setSelectedStakePool(foundStakePool);
      setIsDrawerVisible(true);
      fetchStakePools({ searchString: '' });
    };
    fetchSelectedStakePool();
  }, [
    setIsDrawerVisible,
    setSelectedStakePool,
    stakePoolSearchResults,
    networkInfo,
    isSearching,
    isInMemory,
    fetchStakePools,
  ]);

  return <StakePoolsTable scrollableTargetId={LACE_APP_ID} onStake={onStake} />;
};
