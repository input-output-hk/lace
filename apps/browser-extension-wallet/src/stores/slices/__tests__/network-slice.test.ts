/* eslint-disable no-magic-numbers */
import { networkSlice } from '../network-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import { BlockchainProviderSlice, NetworkSlice, StateStatus, WalletInfoSlice } from '@src/stores/types';
import { mockInMemoryWallet } from '@src/utils/mocks/test-helpers';
import '@testing-library/jest-dom';
import { NetworkInformation } from '@types';
import create, { GetState, SetState } from 'zustand';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';

const mockNetworkSlice = (
  set: SetState<NetworkSlice>,
  get: GetState<BlockchainProviderSlice & WalletInfoSlice & NetworkSlice>
): NetworkSlice => {
  get = () =>
    ({ inMemoryWallet: mockInMemoryWallet, blockchainProvider: mockBlockchainProviders() } as BlockchainProviderSlice &
      WalletInfoSlice &
      NetworkSlice);
  return networkSlice({ set, get });
};

describe('Testing staking network slice', () => {
  test('should create store hook with network slice', () => {
    const useNetworkHook = create(mockNetworkSlice);
    const { result } = renderHook(() => useNetworkHook());

    expect(result.current.fetchNetworkInfo).toBeDefined();
    expect(result.current.networkStateStatus).toBe(StateStatus.IDLE);
    expect(result.current.networkInfo).not.toBeDefined();
  });

  test('should change network info state', async () => {
    const useNetworkHook = create(mockNetworkSlice);
    const { result } = renderHook(() => useNetworkHook());

    await act(async () => {
      await result.current.fetchNetworkInfo();

      expect(result.current.networkInfo).toMatchObject<NetworkInformation>({
        currentEpoch: '286',
        currentEpochIn: new Date(1_635_435_561_134),
        nextEpochIn: new Date(1_635_435_561_134 + 30_000),
        stakePoolsAmount: '2',
        totalStaked: { unit: 'B', number: '1.06' },
        totalStakedPercentage: 2.5
      });
    });
  });
});
