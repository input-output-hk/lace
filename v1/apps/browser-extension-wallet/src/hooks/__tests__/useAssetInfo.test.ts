import { renderHook } from '@testing-library/react-hooks';
import { useAssetInfo } from '../useAssetInfo';
import { BehaviorSubject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { HandleInfo, ObservableWallet } from '@cardano-sdk/wallet';
import * as stores from '@stores';
jest.mock('@stores');

const assets: Partial<Wallet.Asset.AssetInfo>[] = [
  {
    assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
    nftMetadata: { image: Wallet.Asset.Uri('ipfs://image1'), name: 'name1', version: '1' }
  },
  {
    assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa6'),
    nftMetadata: { image: Wallet.Asset.Uri('ipfs://image2'), name: 'name2', version: '1' }
  }
];
const handles: Partial<HandleInfo>[] = [
  {
    ...assets[0],
    image: Wallet.Asset.Uri('ipfs://personalizedImage1')
  }
];

const assetInfo = new Map<Wallet.Cardano.AssetId, Partial<Wallet.Asset.AssetInfo>>(
  assets.map((asset) => [asset.assetId, asset])
);

describe('Testing useAssetInfo hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return empty map when values are undefined', () => {
    const inMemoryWallet = {
      handles$: new BehaviorSubject(undefined),
      assetInfo$: new BehaviorSubject(undefined)
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
      inMemoryWallet
    }));
    const { result } = renderHook(() => useAssetInfo());
    expect(result.current).toEqual(new Map());
  });

  test('should return empty map when values are empty', () => {
    const inMemoryWallet: Partial<ObservableWallet> = {
      handles$: new BehaviorSubject([]),
      assetInfo$: new BehaviorSubject(new Map())
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
      inMemoryWallet
    }));
    const { result } = renderHook(() => useAssetInfo());
    expect(result.current).toEqual(new Map());
  });

  test('should return asset map when handles$ is undefined', () => {
    const inMemoryWallet = {
      handles$: new BehaviorSubject(undefined),
      assetInfo$: new BehaviorSubject(assetInfo)
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
      inMemoryWallet
    }));
    const { result } = renderHook(() => useAssetInfo());
    expect(result.current).toEqual(assetInfo);
  });

  test('should return asset map when handles$ is not in assets', () => {
    const inMemoryWallet = {
      handles$: new BehaviorSubject([
        { ...handles, assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa8') }
      ]),
      assetInfo$: new BehaviorSubject(assetInfo)
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
      inMemoryWallet
    }));
    const { result } = renderHook(() => useAssetInfo());
    expect(result.current).toEqual(assetInfo);
  });

  test('should return asset with handle information', () => {
    const inMemoryWallet = {
      handles$: new BehaviorSubject(handles),
      assetInfo$: new BehaviorSubject(assetInfo)
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
      inMemoryWallet
    }));
    const { result } = renderHook(() => useAssetInfo());
    expect(result.current.get(assets[0].assetId)).toEqual(handles[0]);
    expect(result.current.get(assets[1].assetId)).toEqual(assets[1]);
  });
});
