/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockInitializeTx = jest.fn();
const mockBuildDelegation = jest.fn();
import { renderHook } from '@testing-library/react-hooks';
import { useBuildDelegation } from '../useBuildDelegation';
import { cardanoStakePoolMock } from '../../utils/mocks/test-helpers';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      buildDelegation: mockBuildDelegation
    }
  };
});

jest.mock('../../features/delegation/stores', () => ({
  ...jest.requireActual<any>('../../features/delegation/stores'),
  useDelegationStore: () => ({
    selectedStakePool: cardanoStakePoolMock.pageResults[0]
  })
}));

const inMemoryWallet = {
  initializeTx: mockInitializeTx
};

jest.mock('../../stores', () => ({
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    inMemoryWallet
  })
}));

describe('Testing useBuildDelegation hook', () => {
  process.env.AVAILABLE_CHAINS = process.env.AVAILABLE_CHAINS || 'Mainnet,Preprod,Preview';
  process.env.DEFAULT_CHAIN = process.env.DEFAULT_CHAIN || 'Preprod';

  test('should return build delegation transaction function', () => {
    const { result } = renderHook(() => useBuildDelegation());
    expect(result.current).toBeDefined();
  });

  describe('Testing build delegation transaction function', () => {
    test('should build delegation using buildDelegation util and return initialized tx', async () => {
      const mockedTxConfig = 'txConfig';
      mockBuildDelegation.mockImplementation(async () => await mockedTxConfig);
      const { result } = renderHook(() => useBuildDelegation());

      await result.current();

      expect(mockBuildDelegation).toBeCalledWith(inMemoryWallet, cardanoStakePoolMock.pageResults[0].id);
      expect(mockInitializeTx).toBeCalledWith(mockedTxConfig);
    });
  });
});
