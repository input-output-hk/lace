import { buildMockProviders, IMockProviders } from '@src/utils/mocks/context-providers';
import { renderHook } from '@testing-library/react-hooks';
import { useWalletStore } from '@stores/StoreProvider';
import { stakingInfoSelector, networkInfoStatusSelector, stakePoolResultsSelector } from '../staking-selectors';
import { StateStatus } from '@src/stores/types';

describe('Testing staking selectors', () => {
  let MockProviders: IMockProviders;

  beforeAll(async () => {
    ({ MockProviders } = await buildMockProviders());
  });

  describe('Testing stakingInfoSelector', () => {
    test('should return staking info state and fetchers', () => {
      const { result } = renderHook(() => useWalletStore(stakingInfoSelector), {
        wrapper: MockProviders
      });

      expect(Object.keys(result.current)).toStrictEqual(['networkInfo', 'fetchNetworkInfo']);

      expect(Object.keys(result.current)).not.toContain('walletInfo');
    });
  });

  describe('Testing networkInfoStatusSelector', () => {
    test('should return false for network info status ', () => {
      const { result } = renderHook(() => useWalletStore(networkInfoStatusSelector), {
        wrapper: MockProviders
      });

      expect(result.current).toBe(false);
    });
    test('should return true for LOADING network info status ', async () => {
      ({ MockProviders } = await buildMockProviders({ walletStore: { networkStateStatus: StateStatus.LOADING } }));
      const { result } = renderHook(() => useWalletStore(networkInfoStatusSelector), {
        wrapper: MockProviders
      });

      expect(result.current).toBe(true);
    });
    test('should return true for IDLE network info status ', async () => {
      ({ MockProviders } = await buildMockProviders({ walletStore: { networkStateStatus: StateStatus.IDLE } }));
      const { result } = renderHook(() => useWalletStore(networkInfoStatusSelector), {
        wrapper: MockProviders
      });

      expect(result.current).toBe(true);
    });
  });

  describe('Testing stakepoolsResultsSelector', () => {
    test('should return stake pools results state and fetchers', () => {
      const { result } = renderHook(() => useWalletStore(stakePoolResultsSelector), {
        wrapper: MockProviders
      });

      expect(result.current).toHaveProperty('stakePoolSearchResults');
      expect(result.current).toHaveProperty('selectedStakePool');
      expect(result.current).toHaveProperty('isSearching');
      expect(result.current).toHaveProperty('fetchStakePools');
      expect(result.current).toHaveProperty('setSelectedStakePool');
    });
  });
});
