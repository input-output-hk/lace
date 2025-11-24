/* eslint-disable no-magic-numbers */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import cn from 'classnames';
import { Drawer, DrawerNavigation, PostHogAction, Search } from '@lace/common';
import { useSwaps } from '../SwapProvider';
import { ListEmptyState, TokenItem, TokenItemProps } from '@lace/core';
import styles from './TokenSelectDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { SwapStage } from '../../types';
import { TOKEN_LIST_PAGE_SIZE } from '../../const';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import { Skeleton } from 'antd';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

type TokenSelectProps = {
  selectionType: 'in' | 'out';
  tokens: DropdownList[];
  onTokenSelect: (token: DropdownList) => void;
  doesWalletHaveTokens?: boolean;
  selectedToken?: string;
  searchTokens?: (item: DropdownList, searchValue: string) => boolean;
};

// Duplicated/Extracted from AssetSelectorOverlay, don't edit, coalesce in V2
export type DropdownList = Omit<TokenItemProps, 'onClick' | 'fiat'> & { id: string; decimals?: number };

export const TokenSelectDrawer = (props: TokenSelectProps): React.ReactElement => {
  const { doesWalletHaveTokens, searchTokens, tokens, selectionType, selectedToken, onTokenSelect } = props;
  const { stage, setStage } = useSwaps();
  const { t } = useTranslation();
  const [value, setValue] = useState<string>();
  const [focus, setFocus] = useState(false);
  const [searchResult, setSearchResult] = useState({ tokens: tokens.slice(0, TOKEN_LIST_PAGE_SIZE) });
  const [isSearching, setIsSearching] = useState(false);
  const [innerTokens, setInnerTokens] = useState({ tokens: tokens.slice(0, TOKEN_LIST_PAGE_SIZE) });
  const handleSearch = (search: string) => setValue(search.toLowerCase());
  const [isLoadingMoreTokens, setIsLoadingMoreTokens] = useState(false);
  const posthog = usePostHogClientContext();

  const handleTokenClick = useCallback(
    (token: DropdownList) => {
      if (token?.id === selectedToken) {
        // eslint-disable-next-line unicorn/no-null
        onTokenSelect(null);
      } else {
        onTokenSelect(token);
        posthog.sendEvent(PostHogAction.SwapsSelectToken, {
          selectionType,
          selectedToken: token.description ?? token.name
        });
      }
      setStage(SwapStage.Initial);
    },
    [selectedToken, setStage, onTokenSelect, posthog, selectionType]
  );

  const filterAssets = useCallback(async () => {
    if (!value) {
      setSearchResult(innerTokens);
      setIsSearching(false);
      return;
    }
    const filter = () => tokens?.filter((item) => !value || searchTokens?.(item, value));
    setIsSearching(true);
    const result = filter();
    setSearchResult({ tokens: result ?? [] });
    setIsSearching(false);
  }, [searchTokens, tokens, value, innerTokens]);

  useEffect(() => {
    filterAssets();
  }, [filterAssets]);

  const fetchMore = () => {
    setIsLoadingMoreTokens(true);
    setInnerTokens({
      tokens: [
        ...(innerTokens?.tokens || []),
        ...tokens.slice(innerTokens.tokens.length, innerTokens.tokens.length + TOKEN_LIST_PAGE_SIZE)
      ]
    });
    setIsLoadingMoreTokens(false);
  };

  const hasMoreTokens = innerTokens?.tokens.length !== tokens.length;

  const [infiniteScrollRef] = useInfiniteScroll({
    loading: isLoadingMoreTokens,
    hasNextPage: hasMoreTokens,
    onLoadMore: fetchMore,
    rootMargin: '0px 0px 0px 0px'
  });

  const isDrawerOpen = useMemo(() => {
    if (
      (stage === SwapStage.SelectTokenIn && selectionType === 'in') ||
      (stage === SwapStage.SelectTokenOut && selectionType === 'out')
    ) {
      return true;
    }
    return false;
  }, [stage, selectionType]);

  return (
    <Drawer
      open={isDrawerOpen}
      maskClosable
      onClose={() => setStage(SwapStage.Initial)}
      navigation={
        <DrawerNavigation title={t('swaps.pageHeading')} onCloseIconClick={() => setStage(SwapStage.Initial)} />
      }
    >
      <div data-testid="swap-asset-selector" className={cn(styles.assetsContainer)}>
        <Search
          showClear={focus || !!value}
          onClearButtonClick={(e) => {
            e.stopPropagation();
            setValue('');
          }}
          withSearchIcon
          inputPlaceholder={t('cardano.stakePoolSearch.searchPlaceholder')}
          onChange={handleSearch}
          value={value}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          isFocus={focus}
          loading={isSearching}
          style={{ width: '100%' }}
        />
        <div className={styles.listBox}>
          {!doesWalletHaveTokens && (
            <ListEmptyState
              message={
                <>
                  {t('core.assetSelectorOverlay.youDonthaveAnyTokens')}
                  <br /> {t('core.assetSelectorOverlay.justAddSomeDigitalAssetsToGetStarted')}
                </>
              }
              icon="sad-face"
            />
          )}
          {(!searchResult?.tokens || searchResult?.tokens.length === 0) && (
            <ListEmptyState message={t('core.assetSelectorOverlay.noMatchingResult')} icon="sad-face" />
          )}
          {searchResult.tokens?.length > 0 &&
            searchResult.tokens?.map((item, idx) => (
              <TokenItem
                key={`${item.id}-${idx}`}
                {...item}
                selected={!!selectedToken && selectedToken === item.id}
                onClick={() => {
                  handleTokenClick(item);
                }}
                fiat={'-'}
              />
            ))}
        </div>
        {hasMoreTokens && (
          <Box mt={'$24'} ref={infiniteScrollRef} data-testid="skeleton">
            <Skeleton />
          </Box>
        )}
      </div>
    </Drawer>
  );
};
