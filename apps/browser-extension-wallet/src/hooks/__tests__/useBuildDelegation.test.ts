/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
/* eslint-disable no-magic-numbers */
const mockSetIsBuildingTx = jest.fn();
const mockSetStakingError = jest.fn();
const mockSetDelegationTxBuilder = jest.fn();
const mockSetDelegationTxFee = jest.fn();
const mockInspect = jest.fn().mockResolvedValue({
  body: {
    fee: '0.17'
  }
});
const mockBuild = jest.fn().mockReturnThis();
const mockDelegate = jest.fn().mockReturnThis();
const mockCreateTxBuilder = jest.fn().mockReturnValue({
  delegate: mockDelegate,
  build: mockBuild,
  inspect: mockInspect
});
import { renderHook } from '@testing-library/react-hooks';
import { useBuildDelegation } from '../useBuildDelegation';
import { cardanoStakePoolMock } from '../../utils/mocks/test-helpers';

jest.mock('../../features/stake-pool-details/store', () => ({
  ...jest.requireActual<any>('../../features/stake-pool-details/store'),
  useStakePoolDetails: () => ({
    setIsBuildingTx: mockSetIsBuildingTx,
    setStakingError: mockSetStakingError
  })
}));

jest.mock('../../features/delegation/stores', () => ({
  ...jest.requireActual<any>('../../features/delegation/stores'),
  useDelegationStore: () => ({
    selectedStakePool: cardanoStakePoolMock.pageResults[0],
    setDelegationTxBuilder: mockSetDelegationTxBuilder,
    setDelegationTxFee: mockSetDelegationTxFee
  })
}));

const inMemoryWallet = {
  createTxBuilder: mockCreateTxBuilder
};

jest.mock('../../stores', () => ({
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    inMemoryWallet
  })
}));

// eslint-disable-next-line promise/avoid-new
const flushPromises = () => new Promise(setImmediate);

describe('Testing useBuildDelegation hook', () => {
  describe('Testing build delegation transaction function', () => {
    test('should build delegation using txBuilder', async () => {
      renderHook(() => useBuildDelegation());

      expect(mockSetIsBuildingTx).toBeCalled();
      expect(mockCreateTxBuilder).toBeCalled();
      expect(mockDelegate).toBeCalledWith(cardanoStakePoolMock.pageResults[0].id);
      expect(mockBuild).toBeCalled();
      expect(mockInspect).toBeCalled();
      await flushPromises();
      expect(mockSetIsBuildingTx).toBeCalledTimes(2);
      expect(mockSetDelegationTxBuilder).toBeCalled();
      expect(mockSetDelegationTxFee).toBeCalledWith('0.17');
      expect(mockSetStakingError).toBeCalledWith();
    });
  });
});
