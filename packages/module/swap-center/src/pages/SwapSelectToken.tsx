import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  EmptyStateMessage,
  GenericFlashList,
  Icon,
  IconButton,
  Row,
  SearchBar,
  Text,
  TokenItem,
  getAssetImageUrl,
  isWeb,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { Token } from '@lace-contract/tokens';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

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
  navigation,
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
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');

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

  const { theme } = useTheme();

  const styles = getStyles(theme);

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
        ...(swapSessionId && { swapSessionId }),
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
      navigation.goBack();
    },
    [
      mode,
      dispatchSellTokenSelected,
      dispatchBuyTokenSelected,
      trackEvent,
      navigation,
      swapSessionId,
    ],
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

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Column style={styles.header}>
          <Row alignItems="center" justifyContent="center">
            <Text.M
              weight="bold"
              align="center"
              testID="swap-select-token-title">
              {title}
            </Text.M>
            {isWeb && (
              <IconButton.Static
                icon={<Icon name="Cancel" size={20} />}
                onPress={navigation.goBack}
                containerStyle={styles.closeButton}
                testID={'side-sheet-close-button'}
              />
            )}
          </Row>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('v2.swap.search')}
            testID="swap-token-search"
          />
        </Column>
      ),
    });
  }, [title, searchQuery, t, navigation, theme, isWeb]);

  const ListEmptyComponent = useMemo(
    () => (
      <Column justifyContent="center" style={styles.listEmptyComponent}>
        <EmptyStateMessage
          message={
            searchQuery
              ? t('v2.swap.no-matching-tokens', { searchTerm: searchQuery })
              : t('v2.swap.no-tokens')
          }
        />
      </Column>
    ),
    [t, searchQuery, styles.listEmptyComponent],
  );

  return (
    <GenericFlashList<DisplayToken>
      data={displayTokens}
      renderItem={renderItem}
      keyExtractor={item => item.tokenId}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    closeButton: {
      backgroundColor: theme.background.primary,
      position: 'absolute',
      right: spacing.M,
      zIndex: 1,
    },
    header: {
      gap: spacing.XL,
      paddingHorizontal: spacing.M,
      paddingTop: spacing.XXL,
    },
    listContent: {
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.XL,
    },
    tokenItem: {
      marginTop: spacing.S,
    },
    listEmptyComponent: { marginTop: spacing.XXXL },
  });
