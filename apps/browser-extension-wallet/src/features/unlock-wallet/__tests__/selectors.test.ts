import { IMockProviders, buildMockProviders } from '@src/utils/mocks/context-providers';
import { renderHook } from '@testing-library/react-hooks';
import { useWalletStore } from '@stores/StoreProvider';
import { lockWalletSelector } from '../selectors';

describe('Testing lockWalletSelector', () => {
  let MockProviders: IMockProviders;

  beforeAll(async () => {
    ({ MockProviders } = await buildMockProviders());
  });
  test('should return locked wallet state, wallet lock info and setter', () => {
    const { result } = renderHook(() => useWalletStore(lockWalletSelector), {
      wrapper: MockProviders
    });

    expect(result.current).toHaveProperty('isWalletLocked');
    expect(result.current).toHaveProperty('walletLock');
  });
});
