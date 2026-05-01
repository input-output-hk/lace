import {
  useAccountSupportsNfts,
  useNftViewReset,
  useUICustomisation,
} from '@lace-contract/app';
import {
  convertLovelacesToAda,
  DEFAULT_DECIMALS,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  FEATURE_FLAG_TOKEN_PRICING,
  getTokenPriceId,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { AccountId, WalletType } from '@lace-contract/wallet-repo';
import {
  Blockchains,
  Icon,
  TabBarMetrics,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { getTokenFiatValueTruncated } from '@lace-lib/util-render';
import { formatLocaleNumber } from '@lace-lib/util-render';
import { useMemo, useState, useCallback, useEffect } from 'react';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { transformAccountsToCards } from './accountCardTransformer';
import { AccountViewType, SelectedAssetView } from './types';
import { useCarouselManagement } from './useCarouselManagement';
import { usePortfolioActions } from './usePortfolioActions';
import { usePriceHistory } from './usePriceHistory';
import { useScrollAnimation } from './useScrollAnimation';

import type { AccountView, AssetView } from './types';
import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { TimeRange } from '@lace-lib/ui-toolkit';

/**
 * Returns the per-token fiat value truncated to 2 dp, matching the arithmetic
 * used in the token list so the portfolio total equals the sum of list values.
 */
const calculateTokenFiatValue = (
  token: Token,
  prices: Record<string, TokenPrice> | undefined,
): number => {
  if (!prices) return 0;

  const priceId = getTokenPriceId(token);
  if (!priceId) return 0;

  const priceData = prices[priceId];
  if (!priceData) return 0;

  return getTokenFiatValueTruncated({
    available: token.available.toString(),
    decimals: token.decimals,
    price: priceData.price,
  });
};

const WALLET_ICONS = {
  [WalletType.HardwareLedger]: <Icon name="HardwareWallet" size={15} />,
  [WalletType.HardwareTrezor]: <Icon name="HardwareWallet" size={15} />,
  [WalletType.InMemory]: <Icon name="Wallet" size={15} />,
  [WalletType.MultiSig]: <Icon name="HardwareWallet" size={15} />,
} as const;

const BLOCKCHAIN_ICONS = {
  Bitcoin: <Blockchains.Bitcoin width={16} height={16} />,
  Cardano: <Blockchains.Cardano width={16} height={16} />,
  Ethereum: <Icon name="Ethereum" size={16} />,
  Midnight: <Blockchains.Midnight width={16} height={16} />,
} as const;

interface UsePortfolioOptions {
  headerHeight: number;
  headerTopInset: number;
}

export const usePortfolio = ({
  headerHeight,
  headerTopInset,
}: UsePortfolioOptions) => {
  const { t } = useTranslation();
  const { isSideMenu } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAssetView, setSelectedAssetView] = useState<SelectedAssetView>(
    SelectedAssetView.Assets,
  );

  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const networkType = useLaceSelector('network.selectNetworkType');
  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const wallets = useLaceSelector('wallets.selectAll');
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');

  const { accountSupportsNfts, hasAnyAccountNftSupport } =
    useAccountSupportsNfts({ accounts });
  // This is used to trigger the useEffect re-render when the network changes
  const networkKey = useLaceSelector('network.selectNetworkKey');
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');
  const syncStatus = useLaceSelector('sync.selectGlobalSyncStatus');
  const hasEverSynced = useLaceSelector('sync.selectHasEverSynced');
  const setActiveAccount = useDispatchLaceAction(
    'wallets.setActiveAccountContext',
  );
  const clearActiveAccount = useDispatchLaceAction(
    'wallets.clearActiveAccountContext',
  );
  const setIsPortfolioView = useDispatchLaceAction('ui.setIsPortfolioView');
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );
  const isPortfolioView = useLaceSelector('ui.getIsPortfolioView');
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );
  const activities = useLaceSelector('activities.selectByAccountId', {
    accountId: AccountId(activeAccountContext?.accountId ?? ''),
  });
  const allPricesRaw = useLaceSelector('tokenPricing.selectPrices');
  const allPriceHistoryRaw = useLaceSelector('tokenPricing.selectPriceHistory');
  const isPricingStale = useLaceSelector('tokenPricing.selectIsPricingStale');

  // Prices and price history are only available on mainnet — discard on testnet
  // to avoid wasteful downstream computations.
  const allPrices = isTokenPricingEnabled ? allPricesRaw : undefined;
  const allPriceHistory = isTokenPricingEnabled
    ? allPriceHistoryRaw
    : undefined;
  const rewardAccountDetails = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const aggregatedFungibleTokensForVisibleAccounts = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensForVisibleAccounts',
  );
  const requestPriceHistory = useDispatchLaceAction(
    'tokenPricing.requestPriceHistory',
  );

  // Derived state for NFT tab visibility
  const isAccountView = activeIndex > 0;
  const currentAccount = isAccountView ? accounts[activeIndex - 1] : null;
  const firstAccountId = accounts[0]?.accountId;
  const shouldShowNftTab = useMemo(() => {
    if (isAccountView) {
      return currentAccount ? accountSupportsNfts(currentAccount) : true;
    }
    return hasAnyAccountNftSupport;
  }, [
    isAccountView,
    currentAccount,
    accountSupportsNfts,
    hasAnyAccountNftSupport,
  ]);

  // Calculate total portfolio value from all tokens
  const totalPortfolioValue = useMemo(() => {
    if (!isTokenPricingEnabled) return null;

    let total = 0;
    for (const token of aggregatedFungibleTokensForVisibleAccounts) {
      total += calculateTokenFiatValue(token, allPrices);
    }

    return total;
  }, [
    isTokenPricingEnabled,
    allPrices,
    aggregatedFungibleTokensForVisibleAccounts,
  ]);

  const { getPriceHistoryData } = usePriceHistory(timeRange);

  /** Account card overrides per blockchain (`AccountCard`, NFT support, …). */
  const accountCardCustomisations = useUICustomisation(
    'addons.loadAccountUICustomisations',
  );

  const { width: windowWidth } = useWindowDimensions();

  const availableWidth = useMemo(
    () =>
      isSideMenu ? windowWidth - TabBarMetrics.vertical.width : windowWidth,
    [isSideMenu, windowWidth],
  );

  const containerWidth = availableWidth;

  const contentWidth = containerWidth;

  const { portfolioActions, createSendAction, createAccountsAction } =
    usePortfolioActions();

  const {
    scrollHandler,
    animatedContainerStyle,
    activeAssetView,
    activeAccountIndex,
  } = useScrollAnimation({
    headerHeight,
    selectedAssetView,
    activeIndex,
    headerTopInset,
  });

  // Wallet and account icons
  const visibleWalletIds = useMemo(
    () => new Set(accounts.map(account => account.walletId)),
    [accounts],
  );

  const visibleWallets = useMemo(
    () => wallets.filter(wallet => visibleWalletIds.has(wallet.walletId)),
    [wallets, visibleWalletIds],
  );

  const walletIcons = useMemo(
    () =>
      visibleWallets.map(wallet => ({
        icon: WALLET_ICONS[wallet.type] || <Icon name="Wallet" size={15} />,
      })),
    [visibleWallets],
  );

  const accountIcons = useMemo(() => {
    return accounts.map(account => {
      const name =
        account.metadata?.name ||
        t('v2.portfolio.account.blockchainAccountType', {
          blockchain: account.blockchainName || t('v2.generic.unknown'),
        });
      const icon = BLOCKCHAIN_ICONS[account.blockchainName] || (
        <Blockchains.Cardano width={16} height={16} />
      );
      return { name, icon };
    });
  }, [accounts, t]);

  // Translation helper functions for account card transformer
  const getAccountName = useCallback(
    (index: number) =>
      t('v2.portfolio.account.defaultName', { index: index + 1 }),
    [t],
  );

  const getAccountType = useCallback(
    (blockchainName: string) =>
      t('v2.portfolio.account.blockchainAccountType', {
        blockchain: blockchainName,
      }),
    [t],
  );

  const rewardsByAccount = useMemo(() => {
    const result: Record<string, string> = {};
    if (!isTokenPricingEnabled) return result;

    for (const account of accounts) {
      if (account.blockchainName !== 'Cardano') continue;

      const details = rewardAccountDetails[account.accountId];
      const rewardsLovelace = details?.rewardAccountInfo?.rewardsSum;
      result[account.accountId] = formatLocaleNumber(
        convertLovelacesToAda(rewardsLovelace),
        DEFAULT_DECIMALS,
      );
    }
    return result;
  }, [isTokenPricingEnabled, accounts, rewardAccountDetails]);

  const accountCards = useMemo(
    () =>
      transformAccountsToCards({
        accounts,
        tokensGroupedByAccount,
        currency,
        portfolioActions,
        arePricesAvailable: isTokenPricingEnabled,
        createSendAction,
        createAccountsAction,
        getAccountName,
        getAccountType,
        priceHistory: allPriceHistory,
        prices: allPrices,
        timeRange,
        rewardsByAccount,
      }),
    [
      accounts,
      tokensGroupedByAccount,
      currency,
      portfolioActions,
      isTokenPricingEnabled,
      createSendAction,
      createAccountsAction,
      getAccountName,
      getAccountType,
      allPriceHistory,
      allPrices,
      timeRange,
      rewardsByAccount,
    ],
  );

  const accountsData: AccountView[] = useMemo(
    () => [
      { type: AccountViewType.Portfolio },
      ...accountCards.map((_, index) => ({
        type: AccountViewType.Account as const,
        accountIndex: index,
      })),
    ],
    [accountCards],
  );

  const assetsData: AssetView[] = useMemo(() => {
    const views: AssetView[] = [{ type: SelectedAssetView.Assets }];

    if (shouldShowNftTab) {
      views.push({ type: SelectedAssetView.Nfts });
    }

    if (!isPortfolioView) {
      views.push({ type: SelectedAssetView.Activities });
    }
    return views;
  }, [isPortfolioView, shouldShowNftTab]);

  const handleIndexChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const isAccountView = index > 0;
      if (!isAccountView) return;

      const account = accounts[index - 1];
      if (account) {
        setActiveAccount({
          walletId: account.walletId,
          accountId: account.accountId,
        });
      }
    },
    [accounts, setActiveAccount],
  );

  // If the active account is no longer visible after a network switch, reset it.
  useEffect(() => {
    if (accounts.length === 0) return;
    const isActiveVisible =
      !!activeAccountContext &&
      accounts.some(
        account => account.accountId === activeAccountContext.accountId,
      );

    if (isActiveVisible) return;

    setActiveIndex(0);
    clearActiveAccount();
  }, [networkKey, accounts, activeAccountContext, clearActiveAccount]);

  // Use extracted carousel management hook
  const carouselManagement = useCarouselManagement({
    containerWidth: contentWidth,
    activeIndex,
    selectedAssetView,
    accountsData,
    assetsData,
    onActiveIndexChange: handleIndexChange,
    onSelectedAssetViewChange: setSelectedAssetView,
  });

  const handleTimeRangeChange = useCallback(
    (newTimeRange: TimeRange) => {
      setTimeRange(newTimeRange);
      if (isTokenPricingEnabled) {
        requestPriceHistory({ timeRange: newTimeRange });
      }
    },
    [isTokenPricingEnabled, requestPriceHistory],
  );

  const tabs = useMemo(() => {
    const baseTabs = [
      {
        label: t('v2.generic.btn.tokens'),
        value: SelectedAssetView.Assets,
        testID: 'tokens-btn',
      },
    ];

    if (shouldShowNftTab) {
      baseTabs.push({
        label: t('v2.generic.btn.nfts'),
        value: SelectedAssetView.Nfts,
        testID: 'nfts-btn',
      });
    }

    if (isAccountView) {
      baseTabs.push({
        label: t('v2.generic.btn.activity'),
        value: SelectedAssetView.Activities,
        testID: 'activity-btn',
      });
    }

    return baseTabs;
  }, [t, isAccountView, shouldShowNftTab]);

  const isLoading = useMemo(() => {
    return syncStatus === 'syncing' && !hasEverSynced;
  }, [syncStatus, hasEverSynced]);

  // Sync activeAssetView shared value with selectedAssetView state
  useEffect(() => {
    const hasChanged = activeAssetView.value !== selectedAssetView;
    if (hasChanged) {
      activeAssetView.value = selectedAssetView;
    }
  }, [selectedAssetView, activeAssetView]);

  // Sync activeAccountIndex shared value with activeIndex state
  useEffect(() => {
    const hasChanged = activeAccountIndex.value !== activeIndex;
    if (hasChanged) {
      activeAccountIndex.value = activeIndex;
    }
  }, [activeIndex, activeAccountIndex]);

  // Reset to Assets view when switching to portfolio view
  useEffect(() => {
    const shouldResetView =
      isPortfolioView && selectedAssetView === SelectedAssetView.Activities;
    if (shouldResetView) {
      setSelectedAssetView(SelectedAssetView.Assets);
    }
  }, [isPortfolioView, selectedAssetView]);

  // Reset to Assets view when NFT support changes (e.g., switching to Midnight account)
  useNftViewReset({
    shouldShowNfts: shouldShowNftTab,
    selectedAssetView,
    setSelectedAssetView,
    nftViewValue: SelectedAssetView.Nfts,
    defaultViewValue: SelectedAssetView.Assets,
  });

  // Update portfolio view state based on active index
  useEffect(() => {
    setIsPortfolioView(activeIndex === 0);
  }, [activeIndex, setIsPortfolioView]);

  return {
    activities,
    isTokenPricingEnabled,
    isPricingStale,
    totalPortfolioValue,
    priceHistoryData: getPriceHistoryData(timeRange),
    portfolioSummary: {
      wallets: walletIcons,
      accounts: accountIcons,
    },
    accounts,
    accountCards,
    accountCardCustomisations,
    createSendAction,
    createAccountsAction,
    timeRange,
    activeIndex,
    handleTimeRangeChange,
    handleIndexChange,
    tabs,
    currency,
    portfolioActions,
    isLoading,
    selectedAssetView,
    setSelectedAssetView,
    accountsData,
    assetsData,
    containerWidth,
    contentWidth,
    activeAccountContext,
    firstAccountId,
    scrollHandler,
    animatedContainerStyle,
    isPortfolioView,
    currentAccount,
    networkType,
    ...carouselManagement,
  };
};
