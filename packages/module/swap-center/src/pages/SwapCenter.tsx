import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  SheetRoutes,
  useFocusEffect,
} from '@lace-lib/navigation';
import {
  Button,
  Column,
  DropdownMenu,
  getAssetImageUrl,
  Icon,
  Row,
  SwapInput,
  Text,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, ScrollView, View } from 'react-native';

import { QuoteInfo } from '../components/QuoteInfo';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type {
  LayoutSize,
  SwapInputHandle,
  SwapInputToken,
  Theme,
} from '@lace-lib/ui-toolkit';

export const SwapsCenterPage = () => {
  const { t } = useTranslation();
  const { theme, layoutSize } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, layoutSize),
    [theme, layoutSize],
  );

  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const dispatchSellAmountChanged = useDispatchLaceAction(
    'swapFlow.sellAmountChanged',
  );
  const dispatchReset = useDispatchLaceAction('swapFlow.reset', true);
  const currentSlippage = useLaceSelector('swapConfig.selectSlippage');
  const { trackEvent } = useAnalytics();

  // Reset the swap flow state machine on focus entry and blur. Entry reset
  // covers the extension case where the Redux store lives in the service
  // worker and survives tab close, so a fresh mount must clear any prior
  // in-flight flow. Blur reset covers internal navigation away.
  useFocusEffect(
    useCallback(() => {
      dispatchReset();
      return () => {
        dispatchReset();
      };
    }, [dispatchReset]),
  );

  // --- Account selector ---
  const accountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    { blockchainName: 'Cardano' },
  );
  const walletsResult = useLaceSelector('wallets.selectAll');

  const accounts = useMemo(
    () => (Array.isArray(accountsResult) ? accountsResult : []),
    [accountsResult],
  );
  const wallets = useMemo(
    () => (Array.isArray(walletsResult) ? walletsResult : []),
    [walletsResult],
  );

  const stateAccountId =
    'accountId' in swapFlowState ? swapFlowState.accountId : undefined;
  const dispatchAccountChanged = useDispatchLaceAction(
    'swapFlow.accountChanged',
  );

  // Auto-select first account if none selected
  useEffect(() => {
    if (!stateAccountId && accounts.length > 0) {
      dispatchAccountChanged({ accountId: accounts[0].accountId });
    }
  }, [stateAccountId, accounts, dispatchAccountChanged]);

  const selectedAccountId = stateAccountId ?? accounts[0]?.accountId;
  const hasMultipleAccounts = accounts.length > 1;

  const accountData = useMemo(
    () =>
      accounts.map(account => {
        const wallet = wallets.find(w => w?.walletId === account?.walletId);
        return {
          accountId: account.accountId,
          accountName: account?.metadata?.name ?? '',
          walletName: wallet?.metadata?.name ?? '',
          leftIcon: account?.blockchainName ?? 'Cardano',
        };
      }),
    [accounts, wallets],
  );

  const accountDropdownItems = useMemo(
    () =>
      accountData.map(account => ({
        id: account.accountId,
        text: account.accountName,
      })),
    [accountData],
  );

  const handleAccountChange = useCallback(
    (index: number) => {
      const account = accounts[index];
      if (account) {
        dispatchAccountChanged({ accountId: account.accountId });
      }
    },
    [accounts, dispatchAccountChanged],
  );

  const isQuoting = swapFlowState.status === 'Quoting';
  const isQuoted = swapFlowState.status === 'Quoted';
  // User has already pressed "Swap" and the flow is mid-review. Keep the CTA
  // in its post-quote appearance so pressing it re-opens the review sheet
  // instead of falling through to "Choose amount".
  const isSwapInProgress =
    swapFlowState.status === 'Building' ||
    swapFlowState.status === 'Reviewing' ||
    swapFlowState.status === 'AwaitingConfirmation' ||
    swapFlowState.status === 'Processing';

  const sellTokenId =
    'sellTokenId' in swapFlowState ? swapFlowState.sellTokenId : undefined;
  const buyTokenId =
    'buyTokenId' in swapFlowState ? swapFlowState.buyTokenId : undefined;
  const sellAmount =
    'sellAmount' in swapFlowState ? swapFlowState.sellAmount : undefined;

  const sellInputRef = useRef<SwapInputHandle>(null);

  const accountFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    selectedAccountId ?? '',
  );
  const sellTokenData = useMemo(
    () =>
      sellTokenId && accountFungibleTokens
        ? (
            accountFungibleTokens as Array<{
              tokenId: string;
              displayShortName: string;
              available: unknown;
              decimals: number;
              metadata?: { image?: string };
            }>
          ).find(t => t.tokenId === sellTokenId)
        : undefined,
    [sellTokenId, accountFungibleTokens],
  );
  const buyTokenData = useLaceSelector(
    'tokens.selectTokenById',
    buyTokenId ?? '',
  );
  const sellImageUrl = getAssetImageUrl(sellTokenData?.metadata?.image);
  const sellToken: SwapInputToken | undefined = sellTokenId
    ? {
        name: sellTokenData?.displayShortName ?? sellTokenId,
        balance: sellTokenData
          ? formatAmountToLocale(
              String(sellTokenData.available),
              sellTokenData.decimals,
            )
          : undefined,
        icon: sellImageUrl ? { uri: sellImageUrl } : undefined,
      }
    : undefined;
  const providerTokens = useLaceSelector('swapConfig.selectProviderTokens');
  const buyProviderToken = useMemo(
    () =>
      buyTokenId && !buyTokenData && providerTokens
        ? (
            providerTokens as Array<{
              id: string;
              ticker: string;
              name: string;
              icon?: string;
              decimals: number;
            }>
          ).find(pt => pt.id === buyTokenId)
        : undefined,
    [buyTokenId, buyTokenData, providerTokens],
  );
  const buyDisplayName =
    buyTokenData?.displayShortName ??
    buyProviderToken?.ticker ??
    buyProviderToken?.name ??
    buyTokenId;
  const buyImageUrl =
    getAssetImageUrl(buyTokenData?.metadata?.image) ?? buyProviderToken?.icon;
  const buyTokenAccountData = useMemo(
    () =>
      buyTokenId && accountFungibleTokens
        ? (
            accountFungibleTokens as Array<{
              tokenId: string;
              available: unknown;
              decimals: number;
            }>
          ).find(t => t.tokenId === buyTokenId)
        : undefined,
    [buyTokenId, accountFungibleTokens],
  );
  const buyToken: SwapInputToken | undefined = buyTokenId
    ? {
        name: buyDisplayName ?? '',
        balance: buyTokenAccountData
          ? formatAmountToLocale(
              String(buyTokenAccountData.available),
              buyTokenAccountData.decimals,
            )
          : undefined,
        icon: buyImageUrl ? { uri: buyImageUrl } : undefined,
      }
    : undefined;

  const selectedQuote =
    isQuoted && 'selectedQuote' in swapFlowState
      ? swapFlowState.selectedQuote
      : undefined;

  const buyTokenDecimals = buyTokenData?.decimals ?? buyProviderToken?.decimals;
  const expectedBuyAmount =
    selectedQuote?.expectedBuyAmount && buyTokenDecimals !== undefined
      ? formatAmountToLocale(selectedQuote.expectedBuyAmount, buyTokenDecimals)
      : selectedQuote?.expectedBuyAmount;

  const isInsufficientFunds = useMemo(() => {
    if (
      !sellTokenData ||
      !sellAmount ||
      sellAmount === '' ||
      sellAmount === '0'
    ) {
      return false;
    }
    try {
      const inputInSmallestUnit = Math.round(
        Number(sellAmount) * 10 ** sellTokenData.decimals,
      );
      if (Number.isNaN(inputInSmallestUnit)) return false;
      return (
        BigInt(inputInSmallestUnit) > BigInt(String(sellTokenData.available))
      );
    } catch {
      return false;
    }
  }, [sellTokenData, sellAmount]);

  const handleSellTokenPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.SwapSelectSellToken);
  }, []);

  const handleBuyTokenPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.SwapSelectBuyToken);
  }, []);

  const handleSellAmountChange = useCallback(
    (value: string) => {
      dispatchSellAmountChanged({ sellAmount: value });
    },
    [dispatchSellAmountChanged],
  );

  const handleSettingsPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.SwapSlippage);
  }, []);

  const areBothTokensSelected = Boolean(sellTokenId && buyTokenId);

  const handleReviewOrSelectToken = useCallback(() => {
    if (isQuoted || isSwapInProgress) {
      // Just navigate — SwapReview dispatches reviewRequested itself on mount
      // when it sees a Quoted state. Keeping this handler navigation-only
      // avoids a state transition flicker on the first press that was making
      // the CTA look like it had to be tapped twice.
      NavigationControls.sheets.navigate(SheetRoutes.SwapReview);
    } else if (!sellTokenId) {
      NavigationControls.sheets.navigate(SheetRoutes.SwapSelectSellToken);
    } else if (!buyTokenId) {
      NavigationControls.sheets.navigate(SheetRoutes.SwapSelectBuyToken);
    } else {
      sellInputRef.current?.focus();
    }
  }, [isQuoted, isSwapInProgress, sellTokenId, buyTokenId]);

  const ctaLabel = isQuoting
    ? t('v2.swap.fetching-quote')
    : isQuoted || isSwapInProgress
    ? t('v2.swap.swap')
    : areBothTokensSelected
    ? t('v2.swap.choose-amount')
    : t('v2.swap.select-token');

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <Row justifyContent="center" alignItems="center" style={styles.header}>
        <Column alignItems="center" style={styles.headerTitle}>
          <Text.L weight="bold">{t('v2.swap.title')}</Text.L>
          <Text.XS variant="secondary">{t('v2.swap.subtitle')}</Text.XS>
        </Column>
        <Pressable onPress={handleSettingsPress} style={styles.settingsButton}>
          <Icon name="Settings" size={24} color={theme.text.secondary} />
        </Pressable>
      </Row>

      {hasMultipleAccounts && (
        <DropdownMenu
          items={accountDropdownItems}
          title={
            accountDropdownItems.find(item => item.id === selectedAccountId)
              ?.text ?? t('v2.swap.account')
          }
          onSelectItem={handleAccountChange}
          actionText={`${String(accountDropdownItems.length)} ${String(
            t('v2.swap.account'),
          )}`}
          selectedItemId={selectedAccountId}
          testID="swap-account-selector"
        />
      )}

      <Column gap={0} style={styles.swapPanels}>
        <SwapInput
          ref={sellInputRef}
          placeholder={t('v2.swap.select-sell-option')}
          token={sellToken}
          amount={sellAmount ?? ''}
          error={
            isInsufficientFunds ? t('v2.swap.insufficient-funds') : undefined
          }
          onTokenPress={handleSellTokenPress}
          onAmountChange={handleSellAmountChange}
          quickActions={[
            <Button.Secondary
              key="half"
              size="small"
              label={t('v2.swap.half')}
              onPress={() => {
                if (!sellTokenData) return;
                trackEvent('swaps | quick amount | half | press');
                const half =
                  Number(sellTokenData.available) /
                  10 ** sellTokenData.decimals /
                  2;
                dispatchSellAmountChanged({ sellAmount: String(half) });
              }}
            />,
            <Button.Secondary
              key="max"
              size="small"
              label={t('v2.swap.max')}
              onPress={() => {
                if (!sellTokenData) return;
                trackEvent('swaps | quick amount | max | press');
                const max =
                  Number(sellTokenData.available) /
                  10 ** sellTokenData.decimals;
                dispatchSellAmountChanged({ sellAmount: String(max) });
              }}
            />,
          ]}
          testID="swap-sell-input"
        />

        <View style={styles.swapArrowContainer}>
          <View style={styles.swapArrow}>
            <Icon name="ArrowDown" size={16} color={theme.text.primary} />
          </View>
        </View>

        <SwapInput
          placeholder={t('v2.swap.select-buy-option')}
          token={buyToken}
          disabled
          amount={expectedBuyAmount ?? ''}
          onTokenPress={handleBuyTokenPress}
          testID="swap-buy-input"
        />
      </Column>
      <Column style={styles.quoteContainer}>
        {isQuoted && selectedQuote && (
          <QuoteInfo
            quote={selectedQuote}
            slippage={currentSlippage}
            sellTokenName={sellToken!.name}
            buyTokenName={buyToken!.name}
            onSlippagePress={handleSettingsPress}
          />
        )}
        <Button.Primary
          label={ctaLabel}
          onPress={handleReviewOrSelectToken}
          disabled={isQuoting || isInsufficientFunds}
          loading={isQuoting}
          fullWidth
          testID="swap-cta"
        />
      </Column>
    </ScrollView>
  );
};

const getStyles = (theme: Theme, layoutSize: LayoutSize) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.M,
      paddingBottom: spacing.XXXXL,
      gap: spacing.M,
    },
    header: {
      position: 'relative',
    },
    headerTitle: {
      flex: 1,
    },
    quoteContainer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      ...(layoutSize !== 'compact' && { marginBottom: spacing.XXL * 2 }),
    },
    settingsButton: {
      position: 'absolute',
      right: 0,
      padding: spacing.S,
    },
    swapPanels: {
      gap: 0,
    },
    swapArrowContainer: {
      alignItems: 'center',
      zIndex: 1,
      marginVertical: -spacing.S,
    },
    swapArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.background.primary,
      borderWidth: 1,
      borderColor: theme.border.middle,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
