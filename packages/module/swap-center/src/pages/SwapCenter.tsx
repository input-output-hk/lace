import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  AccountSecurityAlertInline,
  Button,
  Column,
  DropdownMenu,
  getAssetImageUrl,
  Icon,
  PageContainerTemplate,
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
import {
  LOVELACE_TOKEN_ID,
  formatLovelaceAsAda,
  isSwapUnderfunded,
  maxSellableBaseAmount,
  requiredAdaForSwap,
  swapAdaOverhead,
} from '../quote-math';

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
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');
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
  useEffect(() => {
    dispatchReset();
    return () => {
      dispatchReset();
    };
  }, [dispatchReset]);

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

  const adaTokenData = useMemo(
    () =>
      accountFungibleTokens
        ? (
            accountFungibleTokens as Array<{
              tokenId: string;
              available: unknown;
            }>
          ).find(token => token.tokenId === LOVELACE_TOKEN_ID)
        : undefined,
    [accountFungibleTokens],
  );
  const adaAvailable = useMemo(() => {
    if (!adaTokenData) return undefined;
    try {
      return BigInt(String(adaTokenData.available));
    } catch {
      return undefined;
    }
  }, [adaTokenData]);

  // The ADA the quote needs on top of the sold amount. Undefined until a quote
  // lands, which is also when the CTA can first commit anything.
  const adaOverhead = useMemo(
    () => (selectedQuote ? swapAdaOverhead(selectedQuote) : undefined),
    [selectedQuote],
  );

  // Selling never costs only the sold amount: fees and the deposit come out of
  // the ADA side too. Checking the sold token alone let a 1 ADA sell through on
  // a 1.99 ADA account, and a 7 ADA sell on a 12 ADA one — both rejected by the
  // build endpoint, the second with an opaque 500.
  const isInsufficientFunds = useMemo(() => {
    if (
      !sellTokenData ||
      !sellTokenId ||
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
      return isSwapUnderfunded({
        adaAvailable,
        quote: selectedQuote,
        sellAmountBase: BigInt(inputInSmallestUnit),
        sellTokenAvailable: BigInt(String(sellTokenData.available)),
        sellTokenId,
      });
    } catch {
      return false;
    }
  }, [sellTokenData, sellTokenId, sellAmount, adaAvailable, selectedQuote]);

  // Naming the figure is the point: "Insufficient funds" alone contradicts the
  // fee row, which shows only 1.85 of a 6.00 requirement. Derived from the same
  // helper the gate uses, so the number quoted is the number enforced.
  const insufficientFundsMessage = useMemo(() => {
    if (!isInsufficientFunds) return undefined;
    if (!selectedQuote || !sellTokenId) return t('v2.swap.insufficient-funds');
    try {
      const sellAmountBase = BigInt(
        Math.round(Number(sellAmount) * 10 ** (sellTokenData?.decimals ?? 0)),
      );
      return t('v2.swap.insufficient-funds-amount', {
        amount: formatLovelaceAsAda(
          requiredAdaForSwap({
            quote: selectedQuote,
            sellAmountBase,
            sellTokenId,
          }),
        ),
      });
    } catch {
      return t('v2.swap.insufficient-funds');
    }
  }, [
    isInsufficientFunds,
    selectedQuote,
    sellTokenId,
    sellAmount,
    sellTokenData,
    t,
  ]);

  // Half and Max must leave the overhead behind, or they set an amount that is
  // guaranteed to fail the build — Max on an ADA balance always did.
  const setSellFraction = useCallback(
    (divisor: bigint) => {
      if (!sellTokenData || !sellTokenId) return;
      try {
        const available = BigInt(String(sellTokenData.available));
        const sellable = maxSellableBaseAmount({
          available,
          overhead: adaOverhead,
          sellTokenId,
        });
        const target =
          available / divisor < sellable ? available / divisor : sellable;
        dispatchSellAmountChanged({
          sellAmount: String(Number(target) / 10 ** sellTokenData.decimals),
        });
      } catch {
        /* leave the amount untouched when the balance is unreadable */
      }
    },
    [sellTokenData, sellTokenId, adaOverhead, dispatchSellAmountChanged],
  );

  const handleSellTokenPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.SwapSelectSellToken);
  }, []);

  const handleBuyTokenPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.SwapSelectBuyToken);
  }, []);

  const handleSellAmountChange = useCallback(
    (value: string) => {
      dispatchSellAmountChanged({ sellAmount: value });
    },
    [dispatchSellAmountChanged],
  );

  const handleSettingsPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.SwapSlippage);
  }, []);

  const areBothTokensSelected = Boolean(sellTokenId && buyTokenId);

  const handleReviewOrSelectToken = useCallback(() => {
    if (isQuoted || isSwapInProgress) {
      // Just navigate — SwapReview dispatches reviewRequested itself on mount
      // when it sees a Quoted state. Keeping this handler navigation-only
      // avoids a state transition flicker on the first press that was making
      // the CTA look like it had to be tapped twice.
      NavigationControls.navigate(SheetRoutes.SwapReview);
    } else if (!sellTokenId) {
      NavigationControls.navigate(SheetRoutes.SwapSelectSellToken);
    } else if (!buyTokenId) {
      NavigationControls.navigate(SheetRoutes.SwapSelectBuyToken);
    } else {
      sellInputRef.current?.focus();
    }
  }, [isQuoted, isSwapInProgress, sellTokenId, buyTokenId]);

  const ctaLabelKey = (() => {
    if (isQuoting) return 'v2.swap.fetching-quote' as const;
    if (isQuoted || isSwapInProgress) return 'v2.swap.swap' as const;
    if (areBothTokensSelected) return 'v2.swap.choose-amount' as const;
    return 'v2.swap.select-token' as const;
  })();
  const ctaLabel = t(ctaLabelKey);

  return (
    <PageContainerTemplate fullWidth>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Row justifyContent="center" alignItems="center" style={styles.header}>
          <Column alignItems="center" style={styles.headerTitle}>
            <Text.L weight="bold" testID="swap-page-title">
              {t('v2.swap.title')}
            </Text.L>
            <Text.XS variant="secondary" testID="swap-page-subtitle">
              {t('v2.swap.subtitle')}
            </Text.XS>
          </Column>
          <Pressable
            onPress={handleSettingsPress}
            style={styles.settingsButton}
            testID="swap-settings-button">
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
        {selectedAccountId ? (
          <AccountSecurityAlertInline accountId={selectedAccountId} />
        ) : null}

        <Column gap={0} style={styles.swapPanels}>
          <SwapInput
            ref={sellInputRef}
            placeholder={t('v2.swap.select-sell-option')}
            token={sellToken}
            amount={sellAmount ?? ''}
            error={insufficientFundsMessage}
            onTokenPress={handleSellTokenPress}
            onAmountChange={handleSellAmountChange}
            quickActions={[
              <Button.Secondary
                key="half"
                size="small"
                label={t('v2.swap.half')}
                testID="swap-sell-input-half"
                onPress={() => {
                  trackEvent('swaps | quick amount | half | press', {
                    ...(swapSessionId && { swapSessionId }),
                  });
                  setSellFraction(2n);
                }}
              />,
              <Button.Secondary
                key="max"
                size="small"
                label={t('v2.swap.max')}
                testID="swap-sell-input-max"
                onPress={() => {
                  trackEvent('swaps | quick amount | max | press', {
                    ...(swapSessionId && { swapSessionId }),
                  });
                  setSellFraction(1n);
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
              sellTokenDecimals={sellTokenData?.decimals}
              buyTokenName={buyToken!.name}
              buyTokenDecimals={buyTokenDecimals}
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
    </PageContainerTemplate>
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
