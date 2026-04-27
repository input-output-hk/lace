import type {
  FlatList as FlatListRef,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { getTokenPriceId } from '@lace-contract/token-pricing';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { getAssetImageUrl, TokenItem, isAndroid } from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  getTokenPriceDisplayProps,
  type TokenPriceDisplayProps,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type FlatList } from 'react-native';
import Animated from 'react-native-reanimated';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { PortfolioEmptyState } from './empty-state';
import { getListHeaderNode } from './utils/getListHeaderNode';

import type { ListHeaderComponentProperty, SelectedAssetView } from './types';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';

type TokensListProps = {
  accountId: AccountId;
  activeIndex: number;
  selectedAssetView: SelectedAssetView;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  ListHeaderComponent?: ListHeaderComponentProperty<Token>;
  footerSpacerHeight?: number;
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>;
  ifFromPortfolio?: boolean;
  isTokenPricingEnabled: boolean;
  listRef?: React.RefObject<FlatListRef | null>;
};

export const TokensList = ({
  accountId,
  activeIndex,
  selectedAssetView,
  style,
  containerStyle,
  ListHeaderComponent,
  footerSpacerHeight,
  scrollHandler,
  ifFromPortfolio,
  isTokenPricingEnabled,
  listRef,
}: TokensListProps) => {
  const { t } = useTranslation();
  const internalListRef = useRef<FlatList>(null);
  const resolvedListRef = listRef ?? internalListRef;

  useEffect(() => {
    resolvedListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeIndex, selectedAssetView, resolvedListRef]);
  const accountAssets = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountId,
  );
  const aggregatedAssetsForVisibleAccounts = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensForVisibleAccounts',
  );
  const isPortfolioView = useLaceSelector('ui.getIsPortfolioView');
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');

  const allPrices = useLaceSelector('tokenPricing.selectPrices') as
    | Record<string, TokenPrice>
    | undefined;
  const hasActivePricingError = useLaceSelector(
    'tokenPricing.selectHasActivePricingError',
  );

  const showToast = useDispatchLaceAction('ui.showToast');

  useEffect(() => {
    if (isTokenPricingEnabled && hasActivePricingError) {
      showToast({
        text: t('v2.token-pricing-stale.error.title'),
        subtitle: t('v2.token-pricing-stale.error.subtitle'),
        color: 'neutral',
        duration: 4,
        position: 'bottom',
        leftIcon: {
          name: 'AlertSquare',
          variant: 'solid',
        },
      });
    }
  }, [isTokenPricingEnabled, hasActivePricingError, showToast]);

  const assets = useMemo(() => {
    const assetsToDisplay = isPortfolioView
      ? aggregatedAssetsForVisibleAccounts
      : accountAssets;
    // Display unnamed assets first in the list
    const unnamedAssets = assetsToDisplay.filter(a => a.unnamed);
    const namedTokens = assetsToDisplay.filter(a => !a.unnamed);
    return [...unnamedAssets, ...namedTokens];
  }, [isPortfolioView, accountAssets, aggregatedAssetsForVisibleAccounts]);

  const isEmpty = assets.length === 0;
  const overScrollMode = isAndroid && isEmpty ? 'never' : undefined;
  const [listHeight, setListHeight] = useState(0);

  const onListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.height);
      if (next !== listHeight) setListHeight(next);
    },
    [listHeight],
  );

  const headerNode = useMemo(
    () => getListHeaderNode(ListHeaderComponent),
    [ListHeaderComponent],
  );

  const getPriceProps = useCallback(
    (asset: Token): TokenPriceDisplayProps | undefined => {
      if (!isTokenPricingEnabled || !allPrices) return undefined;

      const priceId = getTokenPriceId(asset);
      if (!priceId) return undefined;

      const priceData = allPrices[priceId];
      if (!priceData) return undefined;

      return getTokenPriceDisplayProps({
        available: asset.available.toString(),
        decimals: asset.decimals,
        price: priceData.price,
        isPriceStale: priceData.isStale,
      });
    },
    [allPrices, isTokenPricingEnabled],
  );

  const handleAssetPress = useCallback(
    (asset: Token) => {
      NavigationControls.sheets.navigate(SheetRoutes.AssetDetailBottomSheet, {
        token: asset,
        isFromPortfolio: !!ifFromPortfolio,
      });
    },
    [ifFromPortfolio],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <PortfolioEmptyState
        iconName="Coins"
        message={t('v2.emptystate.token.copy')}
      />
    ),
    [t],
  );

  const headerComponent = useMemo(
    () => (
      <>
        {headerNode}
        {isEmpty ? renderEmptyComponent() : null}
      </>
    ),
    [headerNode, isEmpty, renderEmptyComponent],
  );

  const renderItem = useCallback(
    ({ item }: { item: Token }) => {
      const asset = item;
      const priceProps = getPriceProps(asset);
      const formattedAvailable = formatAmountToLocale(
        asset.available,
        asset.decimals,
      );
      let formattedPending: string | undefined = undefined;
      if (BigNumber.valueOf(asset.pending)) {
        const formatedValue = formatAmountToLocale(
          asset.pending,
          asset.decimals,
        );
        formattedPending = t('v2.token-item.pending', {
          amount: formatedValue,
        });
      }
      const isShielded =
        asset.blockchainName === 'Midnight' &&
        (
          asset.metadata?.blockchainSpecific as
            | MidnightSpecificTokenMetadata
            | undefined
        )?.kind === 'shielded';

      const isUnnamed = asset.blockchainName === 'Midnight' && asset.unnamed;

      return (
        <TokenItem
          logo={
            asset.metadata?.image ? getAssetImageUrl(asset.metadata?.image) : ''
          }
          name={
            asset.unnamed
              ? asset.tokenId
              : asset.metadata?.ticker ?? asset.displayLongName
          }
          balance={formattedAvailable}
          balancePendingText={formattedPending}
          currency={currency.name}
          shieldedOnAvatarOnly={ifFromPortfolio}
          shielded={isShielded}
          unnamed={isUnnamed}
          {...(ifFromPortfolio && { chainSymbol: asset.blockchainName })}
          {...priceProps}
          onPress={() => {
            handleAssetPress(asset);
          }}
          testID={`token-item-${asset.tokenId}`}
        />
      );
    },
    [currency.name, handleAssetPress, getPriceProps, ifFromPortfolio, t],
  );

  const keyExtractor = useCallback(
    (item: Token) => `token-item-${item.tokenId}`,
    [],
  );

  const mergedContentContainerStyle = useMemo(() => {
    if (!footerSpacerHeight || assets.length > 2 || listHeight <= 0) {
      return containerStyle;
    }
    return [
      containerStyle,
      {
        minHeight: listHeight + footerSpacerHeight,
      },
    ];
  }, [containerStyle, footerSpacerHeight, assets.length, listHeight]);

  return (
    <Animated.FlatList
      ref={resolvedListRef}
      data={isEmpty ? [] : assets}
      testID="asset-list-container"
      style={style}
      contentContainerStyle={mergedContentContainerStyle}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      ListEmptyComponent={null}
      ListHeaderComponent={headerComponent}
      bounces={!isEmpty}
      overScrollMode={overScrollMode}
      showsVerticalScrollIndicator={false}
      onLayout={onListLayout}
    />
  );
};
