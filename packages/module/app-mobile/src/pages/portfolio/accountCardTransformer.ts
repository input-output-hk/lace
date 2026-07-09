import {
  calculatePortfolioValueOverTime,
  getTokenPriceId,
} from '@lace-contract/token-pricing';
import { getAssetImageUrl } from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  getTokenFiatValueTruncated,
  valueToLocale,
} from '@lace-lib/util-render';

import type { AccountUICustomisation } from '@lace-contract/app';
import type {
  CurrencyPreference,
  PriceDataPoint,
  TimeRange,
  TokenPrice,
  TokenPriceHistory,
  TokenPriceId,
} from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { AccountCardProps } from '@lace-lib/ui-toolkit';

interface TokensByAccount {
  [accountId: string]: {
    fungible?: Token[];
    nfts?: Token[];
  };
}

type NativeTokenInfo = ReturnType<AccountUICustomisation['nativeTokenInfo']>;

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
  compromisedSuffixByAccount: Record<string, string>;
  getNativeTokenInfo: (blockchainName: string) => NativeTokenInfo | undefined;
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

const getAccountNativeBalance = ({
  accountTokens,
  nativeTokenInfo,
}: {
  accountTokens: Token[];
  nativeTokenInfo: NativeTokenInfo | undefined;
}): string => {
  if (!nativeTokenInfo) return '0';

  const nativeToken = accountTokens.find(
    token => token.tokenId === nativeTokenInfo.tokenId,
  );

  if (!nativeToken) return '0';

  return formatAmountToLocale(
    nativeToken.available.toString(),
    nativeToken.decimals,
    nativeToken.displayDecimalPlaces ?? nativeTokenInfo.decimals,
  );
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
  compromisedSuffixByAccount,
  getNativeTokenInfo,
}: TransformAccountToCardParams): AccountCardProps => {
  const accountName = `${account.metadata?.name ?? getAccountName(index)}${
    compromisedSuffixByAccount[account.accountId] ?? ''
  }`;
  const blockchainName = account.blockchainName ?? 'Cardano';

  const { fungible = [], nfts = [] } =
    tokensGroupedByAccount[account.accountId] ?? {};

  const accountTokens = fungible.map(mapTokenToDisplay);
  const accountNfts = nfts.map(mapTokenToDisplay);

  const totalFiatValue = getAccountTotalFiatValue({
    accountTokens: fungible,
    prices: prices ?? {},
  });
  const nativeTokenInfo = getNativeTokenInfo(blockchainName);

  return {
    accountName,
    accountType: getAccountType(blockchainName),
    blockchain: blockchainName,
    balanceCoin: getAccountNativeBalance({
      accountTokens: fungible,
      nativeTokenInfo,
    }),
    balanceCurrency: valueToLocale(totalFiatValue, 2, 2),
    coin: nativeTokenInfo?.displayShortName ?? '',
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
    onSwapPress: portfolioActions.onSwapPress,
    variant: 'standard',
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
  compromisedSuffixByAccount: Record<string, string>;
  getNativeTokenInfo: (blockchainName: string) => NativeTokenInfo | undefined;
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
  compromisedSuffixByAccount,
  getNativeTokenInfo,
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
      compromisedSuffixByAccount,
      getNativeTokenInfo,
    }),
  );
