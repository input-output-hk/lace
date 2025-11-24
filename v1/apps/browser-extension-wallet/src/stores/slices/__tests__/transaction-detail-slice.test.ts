/* eslint-disable @typescript-eslint/no-unused-vars */
import { renderHook, act } from '@testing-library/react-hooks';
import { BlockchainProviderSlice, ActivityDetailSlice, WalletInfoSlice, UISlice } from '../../types';
import { transactionMock } from '../../../utils/mocks/test-helpers';
import { activityDetailSlice } from '../activity-detail-slice';
import '@testing-library/jest-dom';
import create, { GetState, SetState } from 'zustand';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';
import { ActivityStatus, TransactionActivityType } from '@lace/core';

const mockActivityDetailSlice = (
  set: SetState<ActivityDetailSlice>,
  get: GetState<BlockchainProviderSlice & ActivityDetailSlice & WalletInfoSlice & UISlice>
): ActivityDetailSlice => {
  get = () =>
    ({ blockchainProvider: mockBlockchainProviders() } as BlockchainProviderSlice &
      ActivityDetailSlice &
      WalletInfoSlice &
      UISlice);
  return activityDetailSlice({ set, get });
};

describe('Testing createStoreHook slice', () => {
  test('should create store hook with transaction slices slice', () => {
    const useTransactionsStore = create(mockActivityDetailSlice);
    const { result } = renderHook(() => useTransactionsStore());
    expect(result).toBeDefined();
  });

  test('should return transaction state and state handlers', () => {
    const useTransactionsStore = create(mockActivityDetailSlice);
    const { result } = renderHook(() => useTransactionsStore());
    expect(result.current).toBeDefined();

    expect(result.current.activityDetail).not.toBeDefined();
    expect(result.current.fetchingActivityInfo).toBeDefined();
    expect(result.current.getActivityDetail).toBeDefined();
    expect(result.current.resetActivityState).toBeDefined();
    expect(result.current.setTransactionActivityDetail).toBeDefined();
    expect(result.current.setRewardsActivityDetail).toBeDefined();
  });

  test('should set transaction detail', () => {
    const useTransactionsStore = create(mockActivityDetailSlice);
    const { result, waitForValueToChange } = renderHook(() => useTransactionsStore());

    act(() => {
      result.current.setTransactionActivityDetail({
        type: TransactionActivityType.incoming,
        status: ActivityStatus.SUCCESS,
        activity: transactionMock.tx,
        direction: transactionMock.direction
      });
    });
    waitForValueToChange(() => result.current.activityDetail);
    expect(result.current.activityDetail).toBeDefined();
  });
});
