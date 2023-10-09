/* eslint-disable @typescript-eslint/no-unused-vars */
import { renderHook, act } from '@testing-library/react-hooks';
import { BlockchainProviderSlice, TransactionDetailSlice, WalletInfoSlice } from '../../types';
import { transactionMock } from '../../../utils/mocks/test-helpers';
import { transactionDetailSlice } from '../transaction-detail-slice';
import '@testing-library/jest-dom';
import create, { GetState, SetState } from 'zustand';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';

const mockTransactionDetailSlice = (
  set: SetState<TransactionDetailSlice>,
  get: GetState<BlockchainProviderSlice & TransactionDetailSlice & WalletInfoSlice>
): TransactionDetailSlice => {
  get = () =>
    ({ blockchainProvider: mockBlockchainProviders() } as BlockchainProviderSlice &
      TransactionDetailSlice &
      WalletInfoSlice);
  return transactionDetailSlice({ set, get });
};

describe('Testing createStoreHook slice', () => {
  test('should create store hook with transaction slices slice', () => {
    const useTransactionsStore = create(mockTransactionDetailSlice);
    const { result } = renderHook(() => useTransactionsStore());
    expect(result).toBeDefined();
  });

  test('should return transaction state and state handlers', () => {
    const useTransactionsStore = create(mockTransactionDetailSlice);
    const { result } = renderHook(() => useTransactionsStore());
    expect(result.current).toBeDefined();

    expect(result.current.transactionDetail).not.toBeDefined();
    expect(result.current.fetchingTransactionInfo).toBeDefined();
    expect(result.current.getTransactionDetails).toBeDefined();
    expect(result.current.resetTransactionState).toBeDefined();
    expect(result.current.setTransactionDetail).toBeDefined();
  });

  test('should set transaction detail', () => {
    const useTransactionsStore = create(mockTransactionDetailSlice);
    const { result, waitForValueToChange } = renderHook(() => useTransactionsStore());

    act(() => {
      result.current.setTransactionDetail({ tx: transactionMock.tx, direction: transactionMock.direction });
    });
    waitForValueToChange(() => result.current.transactionDetail);
    expect(result.current.transactionDetail).toBeDefined();
  });
});
