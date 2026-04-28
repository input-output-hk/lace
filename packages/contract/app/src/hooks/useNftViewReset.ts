import { useEffect } from 'react';

interface UseNftViewResetOptions<T> {
  shouldShowNfts: boolean;
  selectedAssetView: T;
  setSelectedAssetView: (view: T) => void;
  nftViewValue: T;
  defaultViewValue: T;
}

export const useNftViewReset = <T>({
  shouldShowNfts,
  selectedAssetView,
  setSelectedAssetView,
  nftViewValue,
  defaultViewValue,
}: UseNftViewResetOptions<T>): void => {
  useEffect(() => {
    if (!shouldShowNfts && selectedAssetView === nftViewValue) {
      setSelectedAssetView(defaultViewValue);
    }
  }, [
    shouldShowNfts,
    selectedAssetView,
    setSelectedAssetView,
    nftViewValue,
    defaultViewValue,
  ]);
};
