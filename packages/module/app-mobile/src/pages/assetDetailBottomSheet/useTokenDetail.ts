import { Cardano } from '@cardano-sdk/core';
import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { useConfig, useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import { getTokenPriceId } from '@lace-contract/token-pricing';
import { TokenId } from '@lace-contract/tokens';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  type SheetScreenProps,
} from '@lace-lib/navigation';
import {
  formatAndGroupActivitiesByDate,
  isWeb,
  truncateText,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  formatDate,
  useDeepCompareMemo,
  valueToLocale,
} from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token, TokenDistributionItem } from '@lace-contract/tokens';
import type { PriceDataPoint, TimeRange } from '@lace-lib/ui-toolkit';

const CARDANO_TOKEN_ID_LENGTH = 56;

const EMPTY_ACCOUNT_ID = AccountId('');
const EMPTY_TOKEN_ID = TokenId('');

// `globalState.transactions` is read only by `TokenDetailActivityList` in the
// portfolio-view branch of the template. In the per-account branch nothing
// reads it, but the template's prop type requires the field. Share a stable
// reference so the `globalState` memo doesn't invalidate on every render.
const EMPTY_TRANSACTIONS: Transaction[] = [];

export interface Transaction {
  accountId: string;
  walletId: string;
  blockchainName: string;
  accountName: string;
  walletName: string;
  name: string;
  amount: string;
  currency: string;
  fiatValue: string;
}

const parseCardanoTokenId = (
  tokenId: string,
): { policyId: string; assetNameHex: string } | null => {
  if (tokenId.includes('.')) {
    const [policyId, assetNameHex = ''] = tokenId.split('.');
    if (!policyId) return null;
    return { policyId, assetNameHex };
  }

  if (tokenId.length >= CARDANO_TOKEN_ID_LENGTH) {
    return {
      policyId: tokenId.slice(0, CARDANO_TOKEN_ID_LENGTH),
      assetNameHex: tokenId.slice(CARDANO_TOKEN_ID_LENGTH),
    };
  }

  return null;
};

const getTokenHeaderTitle = ({
  longName,
  shortName,
  tokenId,
  unnamed,
}: {
  longName?: string;
  shortName?: string;
  tokenId?: string;
  unnamed?: boolean;
}) => {
  if (unnamed) {
    return truncateText(tokenId, isWeb ? 28 : 20);
  }

  return shortName || longName || '';
};

const calculateTokenFiatValue = (
  currentTokenPrice: TokenPrice | null | undefined,
  selectedToken: Token,
  item: TokenDistributionItem,
): string => {
  if (!currentTokenPrice?.price || selectedToken?.decimals === undefined) {
    return '';
  }

  const balanceNumber =
    Number(item.balance) / Math.pow(10, selectedToken.decimals);
  const usdValue = balanceNumber * currentTokenPrice.price;
  return valueToLocale(usdValue, 2, 2);
};

export const useTokenDetail = ({
  navigation,
  route,
  isTokenPricingEnabled,
}: SheetScreenProps<SheetRoutes.AssetDetailBottomSheet> & {
  isTokenPricingEnabled: boolean;
}) => {
  const {
    isFromPortfolio,
    isPortfolioView: isPortfolioViewParameter,
    token: selectedToken,
  } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );
  const accountId = activeAccountContext?.accountId;
  const addresses = useLaceSelector(
    'tokens.selectTokenDistributionByTokenIdForVisibleAccounts',
    selectedToken?.tokenId ?? '',
  );

  const aggregatedFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountId || '',
  );

  const takenTokenNames = useMemo(() => {
    return aggregatedFungibleTokens.flatMap(token => [
      token.displayLongName,
      token.displayShortName,
    ]);
  }, [aggregatedFungibleTokens]);
  const setActiveAccount = useDispatchLaceAction(
    'wallets.setActiveAccountContext',
  );
  const showToast = useDispatchLaceAction('ui.showToast');
  const requestPriceHistory = useDispatchLaceAction(
    'tokenPricing.requestPriceHistory',
  );

  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );

  const selectedTokenData = useMemo(
    () =>
      aggregatedFungibleTokens.find(
        token => token.tokenId === selectedToken?.tokenId,
      ),
    [aggregatedFungibleTokens, selectedToken?.tokenId],
  );

  const { distribution: tokenDistribution, totals: tokenTotals } =
    useLaceSelector(
      'tokens.selectTokenDistributionWithTotalsForVisibleAccounts',
      selectedToken?.tokenId || '',
    );

  const selectedItemIndex = useMemo(() => {
    return addresses.findIndex(addr => addr.accountId === accountId);
  }, [addresses, accountId]);

  const [index, setIndex] = useState(
    selectedItemIndex === -1 ? 0 : selectedItemIndex,
  );
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [isPortfolioView, setIsPortfolioView] = useState(
    isPortfolioViewParameter ?? !!isFromPortfolio,
  );

  const tokenTotalBalance = useMemo(() => {
    if (isPortfolioView) {
      return tokenTotals;
    }
    if (!selectedTokenData) return undefined;
    const total =
      BigInt(selectedTokenData.available) + BigInt(selectedTokenData.pending);
    return {
      total,
      decimals: selectedTokenData.decimals ?? 0,
      estimatedPrice: '',
      formattedTotalBalance: '',
    };
  }, [selectedTokenData, isPortfolioView, tokenTotals]);

  const accountIdOrEmpty = accountId ?? EMPTY_ACCOUNT_ID;
  const tokenIdOrEmpty = selectedToken?.tokenId
    ? TokenId(selectedToken.tokenId)
    : EMPTY_TOKEN_ID;

  const activitiesParams = useDeepCompareMemo({
    accountId: accountIdOrEmpty,
    tokenId: tokenIdOrEmpty,
  });
  const activities = useLaceSelector(
    'activities.selectByAccountIdAndTokenId',
    activitiesParams,
  );

  const isLoadingOlderActivities = useLaceSelector(
    'activities.selectIsLoadingOlderActivitiesByAccount',
    accountIdOrEmpty,
  );
  const hasLoadedOldestEntry = useLaceSelector(
    'activities.selectHasLoadedOldestEntryByAccount',
    accountIdOrEmpty,
  );
  const incrementDesiredLoadedActivitiesCount = useDispatchLaceAction(
    'activities.incrementDesiredLoadedActivitiesCount',
  );
  const accountActivitiesParams = useDeepCompareMemo({
    accountId: accountIdOrEmpty,
  });
  const accountActivities = useLaceSelector(
    'activities.selectByAccountId',
    accountActivitiesParams,
  );

  const [address] = useLaceSelector(
    'addresses.selectByAccountId',
    accountIdOrEmpty,
  );
  const [activitiesItemUICustomisation] = useUICustomisation(
    'addons.loadActivitiesItemUICustomisations',
    { blockchainName: address?.blockchainName },
  );
  const { appConfig } = useConfig();
  const tokensMetadataByTokenId = useLaceSelector(
    'tokens.selectTokensMetadata',
  );

  const [tokenDetailsUICustomisation] = useUICustomisation(
    'addons.loadTokenDetailsUICustomisations',
    selectedToken,
  );

  // Get the price ID for the selected token
  const tokenPriceId = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenPriceId(selectedToken);
  }, [selectedToken]);

  const tokenPriceHistory = useLaceSelector(
    'tokenPricing.selectTokenPriceHistoryForRange',
    {
      timeRange: timeRange,
      priceId: tokenPriceId,
    },
  );

  // Get current prices for calculating USD values
  const tokenPrices = useLaceSelector('tokenPricing.selectPrices');
  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );

  // Transform price history to chart format
  const currentPriceData = useMemo(() => {
    if (!tokenPriceHistory || tokenPriceHistory.length === 0) {
      return { data: [0, 0], timestamps: [] };
    }

    return {
      data: tokenPriceHistory.map((point: PriceDataPoint) => point.price),
      timestamps: tokenPriceHistory.map(
        (point: PriceDataPoint) => point.timestamp,
      ),
    };
  }, [tokenPriceHistory]);

  const pricePillLeftDistance = width * (!isWeb ? 0.25 : 0.2);

  const { fingerprintValue, policyIdValue } = useMemo(() => {
    if (selectedToken?.blockchainName !== 'Cardano') {
      return { fingerprintValue: '', policyIdValue: '' };
    }

    const parsed = parseCardanoTokenId(selectedToken?.tokenId ?? '');
    if (!parsed) return { fingerprintValue: '', policyIdValue: '' };

    try {
      const fingerprint = Cardano.AssetFingerprint.fromParts(
        Cardano.PolicyId(parsed.policyId),
        Cardano.AssetName(parsed.assetNameHex),
      );
      return {
        fingerprintValue: fingerprint.toString(),
        policyIdValue: parsed.policyId,
      };
    } catch {
      return { fingerprintValue: '', policyIdValue: '' };
    }
  }, [selectedToken?.blockchainName, selectedToken?.tokenId]);

  const headerTitle = selectedToken?.unnamed
    ? getTokenHeaderTitle({
        tokenId: selectedToken.tokenId,
        unnamed: true,
      })
    : getTokenHeaderTitle({
        longName: selectedToken?.displayLongName,
        shortName: selectedToken?.displayShortName,
      });
  const sendMenuLabel = t('v2.menu.send');
  const totalBalanceLabel = t('v2.token-detail.totalBalance');
  const tokenDetailUsd = t('v2.token-detail.usd');
  const tokenDistributionLabel = t('v2.token-detail.token-distribution');
  const buyButtonLabel = t('v2.menu.buy');
  const estimatedPriceLabel = t('v2.token-detail.estimated-price');
  const tokenInformationTitle = t('v2.token-detail.tokenInformation');
  const tokenActivityTitle = t('tokens.detail-drawer.activity.title');
  const fingerprintTitle = t('v2.token-detail.fingerprint');
  const policyIdTitle = t('v2.token-detail.policyId');
  const estimatedPrice =
    isTokenPricingEnabled && tokenTotalBalance?.estimatedPrice
      ? tokenTotalBalance.estimatedPrice
      : '';
  const coinName = selectedToken?.unnamed
    ? ''
    : selectedToken?.displayShortName || '';

  const totalBalance = useMemo(() => {
    return tokenTotalBalance?.formattedTotalBalance || '';
  }, [tokenTotalBalance]);

  const coinQuantity = useMemo(() => {
    return formatAmountToLocale(
      tokenTotalBalance?.total.toString() || '',
      tokenTotalBalance?.decimals || 0,
    );
  }, [tokenTotalBalance]);

  const items = useMemo(
    () =>
      addresses.map(addr => ({
        id: addr.accountId,
        text: addr.accountName || 'Unknown',
      })),
    [addresses],
  );

  const mappedAddresses = useMemo(
    () =>
      addresses.map(addr => ({
        id: addr.accountId,
        text: addr.accountName || 'Unknown',
      })),
    [addresses],
  );

  const mappedSelectedToken = useMemo(
    () => ({
      blockchainName: selectedToken?.blockchainName || '',
      metadata: selectedToken?.metadata,
    }),
    [selectedToken],
  );

  // Map token distribution to Transaction format for TokenDetailActivityList
  const tokenDistributionTransactions = useMemo(() => {
    if (!selectedToken || !tokenDistribution) {
      return [];
    }

    const currentTokenPrice = tokenPriceId ? tokenPrices[tokenPriceId] : null;

    return tokenDistribution.map(item => {
      const formattedBalance = formatAmountToLocale(
        item.balance.toString(),
        selectedToken?.decimals,
      );

      return {
        accountId: item.accountId,
        walletId: item.walletId,
        blockchainName: item.blockchainName,
        accountName: item.accountName || t('v2.generic.account.default-name'),
        walletName: item.walletName || t('v2.generic.wallet.default-name'),
        name: selectedToken.unnamed
          ? selectedToken.tokenId
          : selectedToken.displayShortName || '', // Token symbol for avatar fallback
        amount: `${formattedBalance}`,
        currency: currencyPreference.name,
        fiatValue: calculateTokenFiatValue(
          currentTokenPrice,
          selectedToken,
          item,
        ),
      };
    });
  }, [
    selectedToken,
    tokenDistribution,
    t,
    tokenPriceId,
    tokenPrices,
    currencyPreference,
  ]);

  const onTokenPress = useCallback(
    (_transaction: Transaction) => {
      setIsPortfolioView(false);
      // Persist the drill-down on the route entry so the per-account view
      // survives a re-mount after navigating to a child sheet (e.g. Activity
      // detail) and back — the sheet navigator only renders the focused route.
      navigation.setParams({ isPortfolioView: false });
      setActiveAccount({
        walletId: WalletId(_transaction.walletId || ''),
        accountId: AccountId(_transaction.accountId || ''),
      });
      const newIndex = addresses.findIndex(
        addr => addr.accountId === _transaction.accountId,
      );
      setIndex(newIndex === -1 ? 0 : newIndex);
    },
    [setIsPortfolioView, addresses, navigation, setActiveAccount],
  );

  // Available only when the sheet was opened from the portfolio tokens list:
  // returns the per-account view back to the multi-account portfolio view.
  const onBackToPortfolioPress = useMemo(
    () =>
      isFromPortfolio
        ? () => {
            setIsPortfolioView(true);
            navigation.setParams({ isPortfolioView: true });
          }
        : undefined,
    [isFromPortfolio, navigation],
  );

  const onSelectItem = useCallback(
    (index: number) => {
      const selectedItem = addresses[index];
      if (!selectedItem) return;
      setIndex(index);
      setActiveAccount({
        walletId: WalletId(selectedItem.walletId || ''),
        accountId: AccountId(selectedItem.accountId || ''),
      });
    },
    [setIndex, addresses],
  );

  const onSendPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.Send, {
      accountId: selectedToken?.accountId,
      assetsSelected: [selectedToken],
    });
  }, [selectedToken, accountId]);

  const onBuyPress = useCallback(() => {
    if (!isBuyAvailable) return;
    NavigationControls.sheets.navigate(SheetRoutes.Buy);
  }, [isBuyAvailable]);

  const onEditNamePress = useCallback(() => {
    if (!selectedToken) return;
    NavigationControls.sheets.navigate(SheetRoutes.EditTokenName, {
      token: selectedToken,
      takenTokenNames,
    });
  }, [selectedToken, takenTokenNames]);

  const handleTimeRangeChange = useCallback(
    (value: TimeRange) => {
      setTimeRange(value);
      if (isTokenPricingEnabled) {
        requestPriceHistory({ timeRange: value });
      }
    },
    [isTokenPricingEnabled, requestPriceHistory],
  );

  const onLoadMorePress = useCallback(() => {
    if (isPortfolioView) return;
    if (!accountId) return;
    if (isLoadingOlderActivities || hasLoadedOldestEntry) return;
    incrementDesiredLoadedActivitiesCount({
      accountId,
      incrementBy: ACTIVITIES_PER_PAGE,
    });
  }, [
    isPortfolioView,
    accountId,
    isLoadingOlderActivities,
    hasLoadedOldestEntry,
    incrementDesiredLoadedActivitiesCount,
  ]);

  // Oldest inspected activity timestamp for THIS account. Activities are
  // stored sorted by timestamp desc, so `at(-1)` is the oldest. Using the
  // activity list (not raw tx history) reflects reward entries too, so the
  // date advances whenever the page grows — not only when a new tx is
  // fetched.
  const oldestInspectedTimestamp = useMemo(
    () => accountActivities.at(-1)?.timestamp,
    [accountActivities],
  );

  const oldestInspectedDate = useMemo(
    () =>
      oldestInspectedTimestamp
        ? formatDate({
            date: oldestInspectedTimestamp,
            type: 'local',
          })
        : undefined,
    [oldestInspectedTimestamp],
  );

  const tokenNameForCopy =
    coinName || truncateText(selectedToken?.tokenId, isWeb ? 28 : 20);

  // Empty list (activities for this token === 0) copy.
  // `empty-keep-searching` when there's more history to inspect;
  // `empty-exhausted` when we've reached the account's oldest tx.
  const emptyActivitiesMessage = useMemo<string | undefined>(() => {
    if (activities.length > 0) return undefined;
    if (hasLoadedOldestEntry) {
      return t('tokens.detail-drawer.activity.empty-exhausted');
    }
    if (!oldestInspectedDate) return undefined;
    return t('tokens.detail-drawer.activity.empty-keep-searching', {
      tokenName: tokenNameForCopy,
      date: oldestInspectedDate,
    });
  }, [
    activities.length,
    hasLoadedOldestEntry,
    oldestInspectedDate,
    tokenNameForCopy,
    t,
  ]);

  // Non-empty list copy shown alongside the footer Load-more button when the
  // user has some activities already but can still page further back — the
  // "no activity yet" wording would be wrong here.
  const moreActivitiesHintMessage = useMemo<string | undefined>(() => {
    if (activities.length === 0) return undefined;
    if (hasLoadedOldestEntry) return undefined;
    if (!oldestInspectedDate) return undefined;
    return t('tokens.detail-drawer.activity.more-hint', {
      tokenName: tokenNameForCopy,
      date: oldestInspectedDate,
    });
  }, [
    activities.length,
    hasLoadedOldestEntry,
    oldestInspectedDate,
    tokenNameForCopy,
    t,
  ]);

  const loadMoreLabel = t('tokens.detail-drawer.activity.load-more');

  // Fire the initial "first chunk" fetch when the account has zero
  // activities in the store. Once activities land, this effect self-gates
  // via `accountActivities.length > 0` on subsequent renders. Any further
  // pagination is user-driven via the Load-more button.
  useEffect(() => {
    if (isPortfolioView || !accountId) return;
    if (isLoadingOlderActivities || hasLoadedOldestEntry) return;
    if (accountActivities.length > 0) return;
    incrementDesiredLoadedActivitiesCount({
      accountId,
      incrementBy: ACTIVITIES_PER_PAGE,
    });
  }, [
    isPortfolioView,
    accountId,
    accountActivities.length,
    isLoadingOlderActivities,
    hasLoadedOldestEntry,
    incrementDesiredLoadedActivitiesCount,
  ]);

  const handleActivityPress = useCallback(
    (id: string) => {
      if (activitiesItemUICustomisation?.onActivityClick) {
        activitiesItemUICustomisation.onActivityClick({
          activityId: id,
          address,
          config: appConfig,
        });
        return;
      }
      NavigationControls.sheets.navigate(SheetRoutes.ActivityDetail, {
        activityId: id,
      });
    },
    [activitiesItemUICustomisation, address, appConfig],
  );

  const activityListSections = useMemo(
    () =>
      formatAndGroupActivitiesByDate({
        activities,
        t,
        tokensMetadataByTokenId,
        getMainTokenBalanceChange:
          activitiesItemUICustomisation?.getMainTokenBalanceChange,
        getTokensInfoSummary:
          activitiesItemUICustomisation?.getTokensInfoSummary,
      }),
    [activities, t, tokensMetadataByTokenId, activitiesItemUICustomisation],
  );

  const editNameLabel = t('tokens.detail-drawer.edit-name');
  const tokenIdLabel = t('tokens.detail-drawer.token-id');

  const { copyToClipboard } = useCopyToClipboard({
    onError: () => {
      showToast({
        text: t('v2.generic.btn.copy-error'),
        color: 'negative',
        duration: 3,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
          color: theme.background.primary,
        },
      });
    },
  });

  const TokenNameAddonComponent = tokenDetailsUICustomisation?.TokenNameAddon;
  const tokenNameAddon = useMemo(
    () =>
      TokenNameAddonComponent && selectedTokenData
        ? React.createElement(TokenNameAddonComponent, {
            token: selectedTokenData,
          })
        : undefined,
    [TokenNameAddonComponent, selectedTokenData],
  );

  const labels = {
    buyButtonLabel,
    sendMenuLabel,
    headerTitle,
    totalBalanceLabel,
    tokenDetailUsd,
    tokenDistributionLabel,
    estimatedPriceLabel,
    coinQuantity,
    coinName,
    tokenNameAddon,
    tokenInformationTitle,
    tokenActivityTitle,
    fingerprintTitle,
    policyIdTitle,
    editNameLabel,
    tokenIdLabel,
  };

  const actions = useMemo(
    () => ({
      onBuyPress: isBuyAvailable ? onBuyPress : undefined,
      onSendPress,
      onSelectItem,
      onTimeRangeChange: handleTimeRangeChange,
      onCopyValue: copyToClipboard,
      onEditNamePress:
        selectedTokenData &&
        tokenDetailsUICustomisation?.canEditTokenName?.(selectedTokenData)
          ? onEditNamePress
          : undefined,
      onBackToPortfolioPress,
    }),
    [
      isBuyAvailable,
      onBuyPress,
      onSendPress,
      onSelectItem,
      handleTimeRangeChange,
      copyToClipboard,
      selectedTokenData,
      onEditNamePress,
      tokenDetailsUICustomisation,
      onBackToPortfolioPress,
    ],
  );

  const globalState = useMemo(
    () => ({
      addresses: mappedAddresses,
      selectedToken: mappedSelectedToken,
      transactions: isPortfolioView
        ? tokenDistributionTransactions
        : EMPTY_TRANSACTIONS,
      items,
      accountId,
      onTokenPress,
    }),
    [
      mappedAddresses,
      mappedSelectedToken,
      tokenDistributionTransactions,
      items,
      accountId,
      onTokenPress,
      isPortfolioView,
    ],
  );

  const utils = useMemo(
    () => ({
      estimatedPrice,
      totalBalance,
      index,
      theme,
      isFromPortfolio,
      timeRange,
      currentPriceData,
      pricePillLeftDistance,
      isPortfolioView,
      fingerprint: fingerprintValue,
      policyId: policyIdValue,
      isUnnamed: selectedTokenData?.unnamed,
      tokenId: selectedTokenData?.tokenId,
      tokenPrice: estimatedPrice,
    }),
    [
      estimatedPrice,
      totalBalance,
      index,
      theme,
      isFromPortfolio,
      timeRange,
      currentPriceData,
      pricePillLeftDistance,
      isPortfolioView,
      selectedTokenData?.unnamed,
      selectedTokenData?.tokenId,
      fingerprintValue,
      policyIdValue,
    ],
  );

  return {
    tokenDetailProps: {
      labels,
      actions,
      utils,
      globalState,
      activityListSections,
      onActivityPress: handleActivityPress,
      onLoadMorePress,
      isLoadingOlderActivities,
      hasLoadedOldestEntry,
      emptyActivitiesMessage,
      moreActivitiesHintMessage,
      loadMoreLabel,
    },
    tokenDetailsUICustomisation,
  };
};
