import { walletActivitiesSlice } from '../wallet-activities-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  WalletActivitiesSlice,
  StateStatus,
  AssetDetailsSlice,
  BlockchainProviderSlice,
  TransactionDetailSlice,
  UISlice,
  WalletInfoSlice
} from '@stores/types';
import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/react';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';
import create, { SetState, GetState } from 'zustand';
import { cardanoCoin } from '@src/utils/constants';
import { mockInMemoryWallet, mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';

const mockActivitiesSlice = (
  set: SetState<WalletActivitiesSlice>,
  get: GetState<
    WalletInfoSlice &
      WalletActivitiesSlice &
      TransactionDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice
  >
): WalletActivitiesSlice => {
  get = () =>
    ({
      blockchainProvider: mockBlockchainProviders(),
      walletUI: { cardanoCoin },
      inMemoryWallet: mockInMemoryWallet,
      walletInfo: mockWalletInfoTestnet
    } as WalletInfoSlice &
      WalletActivitiesSlice &
      TransactionDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice);
  return walletActivitiesSlice({ set, get });
};

describe('Testing wallet activities slice', () => {
  test('should create store hook with wallet activities slice', () => {
    const useActivitiesHook = create(mockActivitiesSlice);
    const { result } = renderHook(() => useActivitiesHook());

    expect(result.current.getWalletActivitiesObservable).toBeDefined();
    expect(result.current.walletActivitiesStatus).toBe(StateStatus.IDLE);
  });

  test('should change wallet activities state', async () => {
    const useActivitiesHook = create(mockActivitiesSlice);
    const { result } = renderHook(() => useActivitiesHook());

    await act(async () => {
      const subscription = await result.current.getWalletActivitiesObservable({
        fiatCurrency: { code: 'USD', symbol: '$' },
        cardanoFiatPrice: 1
      });
      subscription.subscribe();
    });

    await waitFor(() => {
      expect(result.current.walletActivities.length).toEqual(1);
    });
  });
});
