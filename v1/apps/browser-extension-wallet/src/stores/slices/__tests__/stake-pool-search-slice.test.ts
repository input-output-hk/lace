/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { stakePoolSearchSlice } from '../stake-pool-search-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import { BlockchainProviderSlice, StakePoolSearchSlice, StateStatus } from '../../types';
import '@testing-library/jest-dom';
import { mockedStakePools } from '../../../api/mock';
import create, { SetState, GetState } from 'zustand';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';

const mockStakePoolSearchSlice = (
  set: SetState<StakePoolSearchSlice>,
  get: GetState<BlockchainProviderSlice & StakePoolSearchSlice>
): StakePoolSearchSlice => {
  get = () => ({ blockchainProvider: mockBlockchainProviders() } as BlockchainProviderSlice & StakePoolSearchSlice);
  return stakePoolSearchSlice({ set, get });
};

describe('Testing stake pool search slice', () => {
  test('should create store hook with stake pool search slice', () => {
    const useStakePoolHook = create(mockStakePoolSearchSlice);
    const { result } = renderHook(() => useStakePoolHook());

    expect(result.current.fetchStakePools).toBeDefined();
    expect(result.current.stakePoolSearchResultsStatus).toBe(StateStatus.IDLE);
    expect(result.current.stakePoolSearchResults.pageResults).toEqual([]);
    expect(result.current.stakePoolSearchResults.totalResultCount).toEqual(null);
    expect(result.current.selectedStakePool).toBeUndefined();
    expect(result.current.setSelectedStakePool).toBeDefined();
  });

  test('should fetch stake pools and change search results', async () => {
    const useStakePoolHook = create(mockStakePoolSearchSlice);
    const { result } = renderHook(() => useStakePoolHook());

    await act(async () => {
      await result.current.fetchStakePools({ searchString: 'VEGASPool' });

      expect(result.current.stakePoolSearchResults.pageResults).toHaveLength(1);
      expect(result.current.stakePoolSearchResults.totalResultCount).toEqual(1);

      expect(result.current.stakePoolSearchResults.pageResults[0].metadata.name).toEqual('VEGASPool');
      expect(result.current.stakePoolSearchResultsStatus).toBe(StateStatus.LOADED);
      expect(result.current.selectedStakePool).toBeUndefined();
    });
  });

  test('should set selected stake pool', async () => {
    const useStakePoolHook = create(mockStakePoolSearchSlice);
    const { result, waitForNextUpdate } = renderHook(() => useStakePoolHook());

    await act(async () => {
      result.current.setSelectedStakePool(mockedStakePools[0]);
      await waitForNextUpdate();
      expect(result.current.selectedStakePool).toEqual(mockedStakePools[0]);
    });
  });
});
