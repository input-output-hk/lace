/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useState } from 'react';
import cn from 'classnames';
import { Radio, RadioChangeEvent } from 'antd';
import { Search } from '@lace/common';
import { NftList, NftItemProps } from '../Nft';
import { TokenItem, TokenItemProps } from '../Token';

import styles from './AssetSelectorOverlay.module.scss';
import { TranslationsFor } from '@src/ui/utils/types';
import { ListEmptyState } from '../ListEmptyState';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

export const stringIncludesValue = (string: string, searchValue: string): boolean =>
  string.toLowerCase().includes(searchValue.toLowerCase());

export type DropdownList = Omit<TokenItemProps, 'onClick'> & { id: string };

export enum ASSET_COMPONENTS {
  NFTS = 'nfts',
  TOKENS = 'tokens'
}

const getTokensContent = (
  params: {
    doesWalletHaveTokens: boolean;
    hasUsedAllTokens: boolean;
    tokens: DropdownList[];
    selectedTokenList?: Array<string>;
  },
  t: TFunction,
  removeTokenFromList: (id: string) => void,
  handleTokenClick: (id: string) => void
) => {
  if (!params.doesWalletHaveTokens)
    return (
      <ListEmptyState
        message={
          <>
            {t('core.assetSelectorOverlay.youDonthaveAnyTokens')}
            <br /> {t('core.assetSelectorOverlay.justAddSomeDigitalAssetsToGetStarted')}
          </>
        }
        icon="sad-face"
      />
    );

  switch (true) {
    case (!params.tokens || params.tokens?.length === 0) && !params.hasUsedAllTokens:
      return <ListEmptyState message={t('core.assetSelectorOverlay.noMatchingResult')} icon="sad-face" />;
    case params.hasUsedAllTokens:
      return <ListEmptyState message={t('core.assetSelectorOverlay.usedAllAssets')} icon="neutral-face" />;
    default:
      return params.tokens.map(({ id, ...item }, idx) => (
        <TokenItem
          selected={params.selectedTokenList?.includes(id)}
          key={`${id}-${idx}`}
          {...item}
          onClick={params.selectedTokenList?.includes(id) ? () => removeTokenFromList(id) : () => handleTokenClick(id)}
        />
      ));
  }
};

const getNftsContent = (
  params: {
    nfts?: Array<NftItemProps & { id: string }>;
    hasUsedAllNFTs: boolean;
    hasNFTs: boolean;
    selectedTokenList?: Array<string>;
    nftListConfig?: { rows?: number };
  },
  t: TFunction,
  removeTokenFromList: (id: string) => void,
  handleTokenClick: (id: string) => void
) => {
  if (!params.hasNFTs)
    return (
      <ListEmptyState
        message={
          <>
            {t('core.assetSelectorOverlay.noNFTs')}
            <br /> {t('core.assetSelectorOverlay.addFundsToStartYourWeb3Journey')}
          </>
        }
        icon="sad-face"
      />
    );

  const nftList = params.nfts?.map(({ id, ...item }) => ({
    ...item,
    onClick: params.selectedTokenList?.includes(id) ? () => removeTokenFromList(id) : () => handleTokenClick(id),
    selected: params.selectedTokenList?.includes(id)
  }));

  switch (true) {
    case (!nftList || nftList.length === 0) && !params.hasUsedAllNFTs:
      return <ListEmptyState message={t('core.assetSelectorOverlay.noMatchingResult')} icon="sad-face" />;
    case params.hasUsedAllNFTs:
      return <ListEmptyState message={t('core.assetSelectorOverlay.usedAllAssets')} icon="neutral-face" />;
    default:
      return <NftList {...params.nftListConfig} items={nftList} />;
  }
};

export interface AssetSelectorOverlayProps {
  translations: TranslationsFor<'assetSelection' | 'tokens' | 'nfts'>;
  nfts?: Array<NftItemProps & { id: string }>;
  tokens?: Array<DropdownList>;
  nftListConfig?: { rows?: number };
  onClick?: (id: string) => void;
  onSearch?: (value: string) => void;
  value?: string;
  intialSection?: ASSET_COMPONENTS;
  hasUsedAllTokens?: boolean;
  hasUsedAllNFTs?: boolean;
  hasNFTs?: boolean;
  doesWalletHaveTokens?: boolean;
  isMultipleSelectionAvailable?: boolean;
  addToMultipleSelectionList?: (id: string) => void;
  selectedTokenList?: Array<string>;
  removeTokenFromList?: (id: string) => void;
  className?: string;
  groups?: Array<ASSET_COMPONENTS.TOKENS | ASSET_COMPONENTS.NFTS>;
}

export const AssetSelectorOverlay = ({
  nfts,
  tokens,
  nftListConfig,
  onClick,
  translations,
  intialSection = ASSET_COMPONENTS.TOKENS,
  hasUsedAllNFTs,
  hasUsedAllTokens,
  hasNFTs,
  isMultipleSelectionAvailable,
  addToMultipleSelectionList,
  selectedTokenList,
  removeTokenFromList,
  doesWalletHaveTokens,
  className,
  groups = [ASSET_COMPONENTS.TOKENS, ASSET_COMPONENTS.NFTS]
}: AssetSelectorOverlayProps): React.ReactElement => {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>();
  const [section, setSection] = useState(intialSection);
  const [focus, setFocus] = useState(false);
  const [searchResult, setSearchResult] = useState({ nfts, tokens });
  const [isSearching, setIsSearching] = useState(false);
  const handleSection = ({ target }: RadioChangeEvent) => setSection(target.value);

  const handleSearch = (search: string) => setValue(search.toLowerCase());

  const handleTokenClick = (id: string) => {
    const clickAction = isMultipleSelectionAvailable ? addToMultipleSelectionList : onClick;
    clickAction?.(id);
  };

  const filterAssets = useCallback(async () => {
    const filter = () => {
      const filteredNfts = nfts?.filter((item) => !value || stringIncludesValue(item.name, value));
      const filteredTokens = tokens?.filter(
        (item) =>
          !value ||
          item.id === value ||
          stringIncludesValue(item.name, value) ||
          stringIncludesValue(item.description, value)
      );
      return Promise.resolve({ filteredNfts, filteredTokens });
    };
    setIsSearching(true);
    const result = await filter();
    setSearchResult({ nfts: result.filteredNfts ?? [], tokens: result.filteredTokens ?? [] });
    setIsSearching(false);
  }, [nfts, tokens, value]);

  useEffect(() => {
    filterAssets();
  }, [filterAssets]);

  return (
    <div data-testid="asset-selector" className={cn(styles.assetsContainer, { [className]: className })}>
      {groups.length > 1 && (
        <div className={styles.radioButtons}>
          <Radio.Group
            onChange={handleSection}
            value={section}
            defaultValue={intialSection}
            buttonStyle="solid"
            data-testid="asset-selector-buttons"
          >
            {groups.map((group) => (
              <Radio.Button key={group} value={group} data-testid={`asset-selector-button-${group}`}>
                {translations[group]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>
      )}

      <Search
        showClear={focus || !!value}
        onClearButtonClick={(e) => {
          e.stopPropagation();
          setValue('');
        }}
        withSearchIcon
        inputPlaceholder="Search by ID or name"
        onChange={handleSearch}
        value={value}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        isFocus={focus}
        loading={isSearching}
      />

      {section === ASSET_COMPONENTS.TOKENS && (
        <div className={styles.listBox}>
          {getTokensContent(
            {
              doesWalletHaveTokens,
              hasUsedAllTokens,
              tokens: searchResult?.tokens,
              selectedTokenList
            },
            t,
            removeTokenFromList,
            handleTokenClick
          )}
        </div>
      )}
      {section === ASSET_COMPONENTS.NFTS && (
        <div className={styles.listBox}>
          {getNftsContent(
            {
              nfts: searchResult?.nfts,
              nftListConfig,
              hasNFTs,
              hasUsedAllNFTs,
              selectedTokenList
            },
            t,
            removeTokenFromList,
            handleTokenClick
          )}
        </div>
      )}
    </div>
  );
};
