import { useMemo, useState } from 'react';
import { NftItemProps, NftListProps, NftsItemsTypes } from '@lace/core';
import { AssetOrHandleInfoMap } from './useAssetInfo';
import { Cardano } from '@cardano-sdk/core';
import debounce from 'lodash/debounce';

const DEBOUNCE_TIME = 1000;

interface NftSearchResultProps {
  isSearching: boolean;
  filteredResults: NftListProps['items'];
  handleSearch: (items: NftListProps['items'], searchValue: string) => void;
}

export const searchNft = (item: NftItemProps, searchValue: string, assetsInfo: AssetOrHandleInfoMap): boolean =>
  item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
  item.assetId === searchValue ||
  assetsInfo.get(Cardano.AssetId(item.assetId)).policyId === searchValue;

export const searchItems = (
  data: NftListProps['items'],
  searchValue: string,
  assetsInfo: AssetOrHandleInfoMap
): NftListProps['items'] =>
  data.filter((item) => {
    if (item.type === NftsItemsTypes.PLACEHOLDER) return true;
    if (item.type === NftsItemsTypes.NFT) return searchNft(item, searchValue, assetsInfo);
    return item.nfts.some((nft) => searchNft(nft, searchValue, assetsInfo));
  });

export const useNftSearch = (assetsInfo: AssetOrHandleInfoMap): NftSearchResultProps => {
  const [isSearching, setIsSearching] = useState(false);
  const [filteredResults, setFilteredResults] = useState<NftListProps['items']>([]);
  const searchDebounced = useMemo(
    () =>
      debounce((items: NftListProps['items'], searchValue: string) => {
        const filteredNfts = searchItems(items, searchValue, assetsInfo);
        setFilteredResults(filteredNfts);
        setIsSearching(false);
      }, DEBOUNCE_TIME),
    [assetsInfo]
  );

  const handleSearch = (items: NftListProps['items'], searchValue: string) => {
    setIsSearching(true);
    searchDebounced(items, searchValue);
  };

  return { isSearching, filteredResults, handleSearch };
};
