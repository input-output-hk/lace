import { StateSelector } from 'zustand';
import { WalletStore, StateStatus } from '..';
import { NetworkInformation } from '../../types';

type StakingSelector = Pick<WalletStore, 'fetchNetworkInfo'> & {
  networkInfo?: NetworkInformation;
};

type StakepoolSearchSelector = Pick<
  WalletStore,
  'fetchStakePools' | 'stakePoolSearchResults' | 'selectedStakePool' | 'setSelectedStakePool' | 'resetStakePools'
> & {
  isSearching: boolean;
};

export const stakingInfoSelector: StateSelector<WalletStore, StakingSelector> = ({
  networkInfo,
  fetchNetworkInfo
}) => ({
  networkInfo,
  fetchNetworkInfo
});

export const networkInfoStatusSelector: StateSelector<WalletStore, boolean> = ({ networkStateStatus }) =>
  networkStateStatus === StateStatus.LOADING || networkStateStatus === StateStatus.IDLE;

export const stakePoolResultsSelector: StateSelector<WalletStore, StakepoolSearchSelector> = ({
  stakePoolSearchResults,
  selectedStakePool,
  stakePoolSearchResultsStatus,
  fetchStakePools,
  setSelectedStakePool,
  resetStakePools
}) => ({
  stakePoolSearchResults,
  selectedStakePool,
  isSearching: stakePoolSearchResultsStatus === StateStatus.LOADING,
  fetchStakePools,
  setSelectedStakePool,
  resetStakePools
});
