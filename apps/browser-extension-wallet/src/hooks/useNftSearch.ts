import { useMemo, useState } from 'react';
import { NftItemProps } from '@lace/core';
import { AssetOrHandleInfoMap } from './useAssetInfo';
import { Cardano } from '@cardano-sdk/core';
import debounce from 'lodash/debounce';

const DEBOUNCE_TIME = 1000;

interface NftSearchResultProps {
  isSearching: boolean;
  filteredResults: NftItemProps[];
  handleSearch: (items: NftItemProps[], searchValue: string) => void;
}

export const searchNfts = (
  data: NftItemProps[],
  searchValue: string,
  assetsInfo: AssetOrHandleInfoMap
): NftItemProps[] =>
  data.filter(
    (item) =>
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.assetId === searchValue ||
      assetsInfo.get(Cardano.AssetId(item.assetId)).policyId === searchValue
  );

export const useNftSearch = (assetsInfo: AssetOrHandleInfoMap): NftSearchResultProps => {
  const [isSearching, setIsSearching] = useState(false);
  const [filteredResults, setFilteredResults] = useState<NftItemProps[]>([]);
  const searchDebounced = useMemo(
    () =>
      debounce((items: NftItemProps[], searchValue: string) => {
        const filteredNfts = searchNfts(items, searchValue, assetsInfo);
        setFilteredResults(filteredNfts);
        setIsSearching(false);
      }, DEBOUNCE_TIME),
    [assetsInfo]
  );

  const handleSearch = (items: NftItemProps[], searchValue: string) => {
    setIsSearching(true);
    searchDebounced(items, searchValue);
  };

  return { isSearching, filteredResults, handleSearch };
};
