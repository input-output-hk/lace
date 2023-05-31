import { renderHook } from '@testing-library/react-hooks';
import { useBuildDelegation } from '../useBuildDelegation';
import { cardanoStakePoolMock } from '../../utils/mocks/test-helpers';

jest.mock('../../features/delegation/stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../features/delegation/stores'),
  useDelegationStore: () => ({
    selectedStakePool: cardanoStakePoolMock
  })
}));

jest.mock('../../stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    inMemoryWallet: {
      initializeTx: jest.fn()
    }
  })
}));

describe('Testing useBuildDelegation hook', () => {
  process.env.AVAILABLE_CHAINS = process.env.AVAILABLE_CHAINS || 'Mainnet,Preprod,Preview';
  process.env.DEFAULT_CHAIN = process.env.DEFAULT_CHAIN || 'Preprod';

  test('should return build delegation transaction function', () => {
    const { result } = renderHook(() => useBuildDelegation());
    expect(result.current).toBeDefined();
  });
});
