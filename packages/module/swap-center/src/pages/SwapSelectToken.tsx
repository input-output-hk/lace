import { useBottomSheetScrollableCreator } from '@gorhom/bottom-sheet';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  EmptyStateMessage,
  GenericFlashList,
  SearchBar,
  Text,
  TokenItem,
  getAssetImageUrl,
  isWeb,
  spacing,
  useScrollEventsHandlers,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { Token } from '@lace-contract/tokens';
import type { SheetScreenProps } from '@lace-lib/navigation';

const SHEET_HEIGHT_RATIO = 0.9;

type DisplayToken = {
  tokenId: TokenId;
  displayName: string;
  balance?: string;
  decimals: number;
  image?: string;
  isTradable: boolean;
  isProviderOnly: boolean;
  accountId?: AccountId;
};

const getMode = (routeName: string): 'buy' | 'sell' =>
  routeName === (SheetRoutes.SwapSelectSellToken as string) ? 'sell' : 'buy';

export const SwapSelectSellToken = (
  props: SheetScreenProps<SheetRoutes.SwapSelectSellToken>,
) => <SwapSelectToken {...props} />;

export const SwapSelectBuyToken = (
  props: SheetScreenProps<SheetRoutes.SwapSelectBuyToken>,
) => <SwapSelectToken {...props} />;

const SwapSelectToken = ({
  route,
}: SheetScreenProps<
  SheetRoutes.SwapSelectBuyToken | SheetRoutes.SwapSelectSellToken
>) => {
  const { t } = useTranslation();
  const mode = getMode(route.name);
  const [searchQuery, setSearchQuery] = useState('');

  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const selectedAccountId =
    'accountId' in swapFlowState ? swapFlowState.accountId : undefined;

  const accountTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    selectedAccountId ?? '',
  );
  const allFungibleTokens = useLaceSelector('tokens.selectFungibleTokens');

  const tradableTokenIds = useLaceSelector('swapConfig.selectTradableTokenIds');
  const providerTokens = useLaceSelector('swapConfig.selectProviderTokens');

  const tradableSet = useMemo(
    () => new Set(tradableTokenIds ?? []),
    [tradableTokenIds],
  );

  // Disable the token already selected on the opposite side
  const oppositeTokenId =
    mode === 'sell'
      ? 'buyTokenId' in swapFlowState
        ? swapFlowState.buyTokenId
        : undefined
      : 'sellTokenId' in swapFlowState
      ? swapFlowState.sellTokenId
      : undefined;

  const dispatchSellTokenSelected = useDispatchLaceAction(
    'swapFlow.sellTokenSelected',
  );
  const dispatchBuyTokenSelected = useDispatchLaceAction(
    'swapFlow.buyTokenSelected',
  );
  const { trackEvent } = useAnalytics();

  // Build unified display token list
  const displayTokens = useMemo((): DisplayToken[] => {
    const walletTokens =
      (mode === 'sell' ? accountTokens : allFungibleTokens) ?? [];
    const walletTokenIds = new Set(walletTokens.map((t: Token) => t.tokenId));

    const walletDisplay: DisplayToken[] = walletTokens.map((token: Token) => ({
      tokenId: token.tokenId,
      displayName: token.displayShortName,
      balance: formatAmountToLocale(String(token.available), token.decimals),
      decimals: token.decimals,
      image: token.metadata?.image
        ? getAssetImageUrl(token.metadata.image)
        : undefined,
      isTradable:
        (tradableSet.size === 0 || tradableSet.has(token.tokenId)) &&
        token.tokenId !== oppositeTokenId,
      isProviderOnly: false,
      accountId: token.accountId,
    }));

    // For buy mode, add provider tokens not in the wallet
    const providerDisplay: DisplayToken[] =
      mode === 'buy' && providerTokens
        ? providerTokens
            .filter(pt => !walletTokenIds.has(TokenId(pt.id)))
            .map(pt => ({
              tokenId: TokenId(pt.id),
              displayName: pt.ticker || pt.name,
              decimals: pt.decimals,
              image: pt.icon,
              isTradable: pt.id !== oppositeTokenId,
              isProviderOnly: true,
            }))
        : [];

    const all = [...walletDisplay, ...providerDisplay];

    // Filter by search
    const filtered = searchQuery
      ? all.filter(token => {
          const query = searchQuery.toLowerCase();
          return (
            token.displayName.toLowerCase().includes(query) ||
            token.tokenId.toLowerCase().includes(query)
          );
        })
      : all;

    // Sort: tradable first, non-tradable last
    return filtered.sort((a, b) => {
      if (a.isTradable && !b.isTradable) return -1;
      if (!a.isTradable && b.isTradable) return 1;
      return 0;
    });
  }, [
    mode,
    accountTokens,
    allFungibleTokens,
    providerTokens,
    tradableSet,
    searchQuery,
    oppositeTokenId,
  ]);

  const handleTokenPress = useCallback(
    (token: DisplayToken) => {
      if (!token.isTradable) return;
      trackEvent('swaps | select token', {
        selectionType: mode === 'sell' ? 'tokenA' : 'tokenB',
        selectedToken: token.displayName,
      });
      if (mode === 'sell') {
        dispatchSellTokenSelected({
          sellTokenId: token.tokenId,
          accountId: token.accountId ?? AccountId(''),
        });
      } else {
        dispatchBuyTokenSelected({
          buyTokenId: token.tokenId,
        });
      }
      NavigationControls.sheets.close();
    },
    [mode, dispatchSellTokenSelected, dispatchBuyTokenSelected, trackEvent],
  );

  const title =
    mode === 'sell'
      ? t('v2.swap.select-token-to-sell')
      : t('v2.swap.select-token-to-buy');

  const renderItem = useCallback(
    ({ item }: { item: DisplayToken }) => (
      <View style={styles.tokenItem}>
        <TokenItem
          name={item.displayName}
          balance={item.balance ?? ''}
          currency=""
          logo={item.image ?? ''}
          onPress={() => {
            handleTokenPress(item);
          }}
          isDisabled={!item.isTradable}
          testID={`swap-token-${item.tokenId}`}
        />
      </View>
    ),
    [handleTokenPress],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <Column style={styles.header}>
        <Text.M weight="bold" align="center">
          {title}
        </Text.M>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('v2.swap.search')}
          testID="swap-token-search"
        />
      </Column>
    ),
    [title, searchQuery, t],
  );

  const ListEmptyComponent = useMemo(
    () => <EmptyStateMessage message={t('v2.swap.no-tokens')} />,
    [t],
  );

  const renderScrollComponent =
    useBottomSheetScrollableCreator<ScrollViewProps>({
      scrollEventsHandlersHook: useScrollEventsHandlers,
    });

  const { height: windowHeight } = useWindowDimensions();

  const wrapperStyle = useMemo(
    () => [styles.wrapper, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  return (
    <View style={wrapperStyle}>
      <GenericFlashList<DisplayToken>
        data={displayTokens}
        renderItem={renderItem}
        keyExtractor={item => item.tokenId}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        renderScrollComponent={isWeb ? undefined : renderScrollComponent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  header: {
    gap: spacing.M,
    paddingBottom: spacing.M,
  },
  listContent: {
    paddingBottom: spacing.XL,
  },
  tokenItem: {
    marginTop: spacing.S,
  },
});
