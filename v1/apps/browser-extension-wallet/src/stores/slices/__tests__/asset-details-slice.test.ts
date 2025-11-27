import create, { UseStore } from 'zustand';

import { AssetDetailsSlice, BlockchainProviderSlice, WalletInfoSlice, ZustandHandlers } from '@stores';
import { assetDetailsSlice } from '@stores/slices/asset-details-slice';
import { act, renderHook } from '@testing-library/react-hooks';
import { mockAssetDetails, mockInMemoryWallet } from '@src/utils/mocks/test-helpers';
import { mockBlockchainProviders } from '@utils/mocks/blockchain-providers';

type MockAssetDetailsSlice = AssetDetailsSlice & WalletInfoSlice & BlockchainProviderSlice;

export const mockAssetDetailsSlice = ({ set, get }: ZustandHandlers<MockAssetDetailsSlice>): AssetDetailsSlice => {
  get = () =>
    ({ inMemoryWallet: mockInMemoryWallet, blockchainProvider: mockBlockchainProviders() } as MockAssetDetailsSlice);
  return assetDetailsSlice({ set, get });
};

describe('Testing asset details slice', () => {
  let useAssetDetailsHook: UseStore<AssetDetailsSlice>;

  beforeEach(() => {
    useAssetDetailsHook = create<MockAssetDetailsSlice>(
      (set, get): MockAssetDetailsSlice => mockAssetDetailsSlice({ set, get }) as MockAssetDetailsSlice
    );
  });

  test('should create store hook with asset details slice', () => {
    const { result } = renderHook(() => useAssetDetailsHook());

    expect(typeof result.current.setAssetDetails).toEqual('function');
    expect(typeof result.current.getAssets).toEqual('function');
  });

  test('should return an asset', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAssetDetailsHook());

    await act(async () => {
      result.current.setAssetDetails(mockAssetDetails);
      await waitForNextUpdate();
      expect(result.current.assetDetails).toEqual(mockAssetDetails);
    });
  });
});
