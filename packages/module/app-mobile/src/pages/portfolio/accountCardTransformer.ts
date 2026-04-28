import {
  calculatePortfolioValueOverTime,
  getTokenPriceId,
} from '@lace-contract/token-pricing';
import { getAssetImageUrl } from '@lace-lib/ui-toolkit';
import {
  getTokenFiatValueTruncated,
  valueToLocale,
} from '@lace-lib/util-render';

import type {
  CurrencyPreference,
  PriceDataPoint,
  TimeRange,
  TokenPrice,
  TokenPriceHistory,
} from '@lace-contract/token-pricing';
import type { TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { AccountCardProps } from '@lace-lib/ui-toolkit';

interface TokensByAccount {
  [accountId: string]: {
    fungible?: Token[];
    nfts?: Token[];
  };
}

interface PortfolioActionsForCard {
  onBuyPress?: () => void;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onSwapPress?: () => void;
}

interface TransformAccountToCardParams {
  account: AnyAccount;
  index: number;
  tokensGroupedByAccount: TokensByAccount;
  currency: CurrencyPreference;
  portfolioActions: PortfolioActionsForCard;
  arePricesAvailable: boolean;
  createSendAction: (accountId: AccountId) => () => void;
  createAccountsAction: () => () => void;
  getAccountName: (index: number) => string;
  getAccountType: (blockchainName: string) => string;
  priceHistory: Record<TokenPriceId, TokenPriceHistory> | undefined;
  prices: Record<TokenPriceId, TokenPrice> | undefined;
  timeRange: TimeRange;
  rewardsByAccount: Record<string, string>;
}

const mapTokenToDisplay = (
  token: Token,
): { name: string; icon?: { uri: string } } => {
  const imageUrl = getAssetImageUrl(token.metadata?.image);
  return {
    name: token.displayLongName,
    ...(imageUrl && { icon: { uri: imageUrl } }),
  };
};

const getAccountTotalFiatValue = ({
  accountTokens,
  prices,
}: {
  accountTokens: Token[];
  prices: Record<TokenPriceId, TokenPrice>;
}): number => {
  let total = 0;
  for (const token of accountTokens) {
    const priceId = getTokenPriceId(token);
    if (!priceId) continue;
    const priceData = prices[priceId];
    if (!priceData) continue;
    total += getTokenFiatValueTruncated({
      available: token.available.toString(),
      decimals: token.decimals,
      price: priceData.price,
    });
  }
  return total;
};

const getAccountChartData = ({
  accountTokens,
  priceHistory,
  prices,
  timeRange,
}: {
  accountTokens: Token[];
  priceHistory: Record<TokenPriceId, TokenPriceHistory>;
  prices: Record<TokenPriceId, TokenPrice>;
  timeRange: TimeRange;
}): number[] => {
  const FLAT_LINE_POINTS = 20;
  const flatLine = new Array<number>(FLAT_LINE_POINTS).fill(0);

  if (accountTokens.length === 0) return flatLine;

  const priceHistoryMap = new Map<TokenPriceId, PriceDataPoint[]>();
  for (const [priceId, history] of Object.entries(priceHistory)) {
    const data = history[timeRange];
    if (data && data.length > 0) {
      priceHistoryMap.set(priceId as TokenPriceId, data);
    }
  }

  if (priceHistoryMap.size === 0) return flatLine;

  const portfolioHistory = calculatePortfolioValueOverTime(
    priceHistoryMap,
    accountTokens,
    prices,
  );

  return portfolioHistory.map(point => point.price);
};

export const transformAccountToCard = ({
  account,
  index,
  tokensGroupedByAccount,
  currency,
  portfolioActions,
  arePricesAvailable,
  createSendAction,
  createAccountsAction,
  getAccountName,
  getAccountType,
  priceHistory,
  prices,
  timeRange,
  rewardsByAccount,
}: TransformAccountToCardParams): AccountCardProps => {
  const accountName = account.metadata?.name ?? getAccountName(index);
  const blockchainName = account.blockchainName ?? 'Cardano';

  const { fungible = [], nfts = [] } =
    tokensGroupedByAccount[account.accountId] ?? {};

  const accountTokens = fungible.map(mapTokenToDisplay);
  const accountNfts = nfts.map(mapTokenToDisplay);

  const totalFiatValue = getAccountTotalFiatValue({
    accountTokens: fungible,
    prices: prices ?? {},
  });

  return {
    accountName,
    accountType: getAccountType(blockchainName),
    blockchain: blockchainName,
    balanceCoin: '',
    balanceCurrency: valueToLocale(totalFiatValue, 2, 2),
    coin: '',
    currency: currency.name,
    tokens: accountTokens,
    nfts: accountNfts,
    rewards: rewardsByAccount[account.accountId] ?? '',
    chartData: getAccountChartData({
      accountTokens: fungible,
      priceHistory: priceHistory ?? {},
      prices: prices ?? {},
      timeRange,
    }),
    onBuyPress: portfolioActions.onBuyPress,
    onSendPress: createSendAction(account.accountId),
    onReceivePress: portfolioActions.onReceivePress,
    onDashboardPress: () => {}, // TODO: LW-14530 Implement
    onSwapPress: portfolioActions.onSwapPress,
    variant: 'standard',
    isShielded: false,
    onAccountsPress: createAccountsAction(),
    arePricesAvailable,
  };
};

interface TransformAccountsToCardsParams {
  accounts: AnyAccount[];
  tokensGroupedByAccount: TokensByAccount;
  currency: CurrencyPreference;
  portfolioActions: PortfolioActionsForCard;
  arePricesAvailable: boolean;
  createSendAction: (accountId: AccountId) => () => void;
  createAccountsAction: () => () => void;
  getAccountName: (index: number) => string;
  getAccountType: (blockchainName: string) => string;
  priceHistory: Record<TokenPriceId, TokenPriceHistory> | undefined;
  prices: Record<TokenPriceId, TokenPrice> | undefined;
  timeRange: TimeRange;
  rewardsByAccount: Record<string, string>;
}

export const transformAccountsToCards = ({
  accounts,
  tokensGroupedByAccount,
  currency,
  portfolioActions,
  arePricesAvailable,
  createSendAction,
  createAccountsAction,
  getAccountName,
  getAccountType,
  priceHistory,
  prices,
  timeRange,
  rewardsByAccount,
}: TransformAccountsToCardsParams): AccountCardProps[] =>
  accounts.map((account, index) =>
    transformAccountToCard({
      account,
      index,
      tokensGroupedByAccount,
      currency,
      portfolioActions,
      arePricesAvailable,
      createSendAction,
      createAccountsAction,
      getAccountName,
      getAccountType,
      priceHistory,
      prices,
      timeRange,
      rewardsByAccount,
    }),
  );
