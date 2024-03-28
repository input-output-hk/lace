import { walletActivitiesSlice } from '../wallet-activities-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  WalletActivitiesSlice,
  StateStatus,
  AssetDetailsSlice,
  BlockchainProviderSlice,
  ActivityDetailSlice,
  UISlice,
  WalletInfoSlice
} from '@stores/types';
import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/react';
import { mockBlockchainProviders } from '@src/utils/mocks/blockchain-providers';
import create, { SetState, GetState } from 'zustand';
import { cardanoCoin } from '@src/utils/constants';
import { mockInMemoryWallet, mockWalletInfoTestnet, mockWalletState } from '@src/utils/mocks/test-helpers';
import { currencyCode } from '@providers/currency/constants';

const mockActivitiesSlice = (
  set: SetState<WalletActivitiesSlice>,
  get: GetState<
    WalletInfoSlice &
      WalletActivitiesSlice &
      ActivityDetailSlice &
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
      walletState: mockWalletState,
      walletInfo: mockWalletInfoTestnet
    } as WalletInfoSlice &
      WalletActivitiesSlice &
      ActivityDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice);
  return walletActivitiesSlice({ set, get });
};

describe('Testing wallet activities slice', () => {
  test('should create store hook with wallet activities slice', () => {
    const useActivitiesHook = create(mockActivitiesSlice);
    const { result } = renderHook(() => useActivitiesHook());

    expect(result.current.getWalletActivities).toBeDefined();
    expect(result.current.walletActivitiesStatus).toBe(StateStatus.IDLE);
  });

  test('should change wallet activities state', async () => {
    const useActivitiesHook = create(mockActivitiesSlice);
    const { result } = renderHook(() => useActivitiesHook());

    await act(async () => {
      await result.current.getWalletActivities({
        fiatCurrency: { code: currencyCode.USD, symbol: '$' },
        cardanoFiatPrice: 1
      });
    });

    await waitFor(() => {
      expect(result.current.walletActivities.length).toEqual(1);
    });
  });
});
