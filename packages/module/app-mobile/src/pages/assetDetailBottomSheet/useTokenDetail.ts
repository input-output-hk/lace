import { Cardano } from '@cardano-sdk/core';
import { useUICustomisation } from '@lace-contract/app';
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
  isWeb,
  truncateText,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale, valueToLocale } from '@lace-lib/util-render';
import React, { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token, TokenDistributionItem } from '@lace-contract/tokens';
import type { PriceDataPoint, TimeRange } from '@lace-lib/ui-toolkit';

const CARDANO_TOKEN_ID_LENGTH = 56;

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
  route,
  isTokenPricingEnabled,
}: SheetScreenProps<SheetRoutes.AssetDetailBottomSheet> & {
  isTokenPricingEnabled: boolean;
}) => {
  const { isFromPortfolio, token: selectedToken } = route.params;
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
  const [safeDeviceSize, setSafeDeviceSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [isPortfolioView, setIsPortfolioView] = useState(!!isFromPortfolio);

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

  const activities = useLaceSelector('activities.selectByAccountIdAndTokenId', {
    accountId: AccountId(accountId ?? ''),
    tokenId: TokenId(selectedToken?.tokenId ?? ''),
  });

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

  const transactions: Transaction[] = []; // TODO: complete

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
      setActiveAccount({
        walletId: WalletId(_transaction.walletId || ''),
        accountId: AccountId(_transaction.accountId || ''),
      });
      const newIndex = addresses.findIndex(
        addr => addr.accountId === _transaction.accountId,
      );
      setIndex(newIndex === -1 ? 0 : newIndex);
    },
    [setIsPortfolioView, addresses],
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

  const handleLayout = ({
    nativeEvent,
  }: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    setSafeDeviceSize?.({
      width: nativeEvent.layout.width,
      height: nativeEvent.layout.height,
    });
  };

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
      handleLayout,
      onCopyValue: copyToClipboard,
      onEditNamePress:
        selectedTokenData &&
        tokenDetailsUICustomisation?.canEditTokenName?.(selectedTokenData)
          ? onEditNamePress
          : undefined,
    }),
    [
      isBuyAvailable,
      onBuyPress,
      onSendPress,
      onSelectItem,
      handleTimeRangeChange,
      handleLayout,
      copyToClipboard,
      selectedTokenData,
      onEditNamePress,
      tokenDetailsUICustomisation,
    ],
  );

  const globalState = useMemo(
    () => ({
      addresses: mappedAddresses,
      selectedToken: mappedSelectedToken,
      transactions: isPortfolioView
        ? tokenDistributionTransactions
        : transactions,
      items,
      accountId,
      safeDeviceSize,
      onTokenPress,
    }),
    [
      mappedAddresses,
      mappedSelectedToken,
      tokenDistributionTransactions,
      transactions,
      items,
      accountId,
      safeDeviceSize,
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
      labels: {
        ...labels,
      },
      actions,
      utils: {
        ...utils,
        tokenPrice: estimatedPrice,
      },
      globalState: {
        ...globalState,
        activityListProps: {
          activities,
          isVisible: true,
          accountId: accountId!,
          scrollEnabled: false,
          deviceSize: safeDeviceSize || { width: 0, height: 0 },
        },
      },
    },
    tokenDetailsUICustomisation,
  };
};
