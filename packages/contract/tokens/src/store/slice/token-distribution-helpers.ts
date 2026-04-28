import { BigIntMath } from '@cardano-sdk/util';
import { BigNumber } from '@lace-sdk/util';

import { TokenId } from '../../value-objects';

import type { RawToken, TokenMetadata } from '../../types';
import type {
  AccountTokensMap,
  TokenDistributionItem,
  TokenTotalBalance,
  WalletEntitiesMap,
} from '../types';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Interface for accounts with their associated tokens and metadata
 */
export interface AccountWithTokens {
  accountId: string;
  metadata: AnyAccount | undefined;
  tokens: RawToken[];
}

/**
 * Helper: Find account metadata by accountId across all wallets
 */
export const findAccountMetadata = (
  accountId: string,
  walletsEntities: WalletEntitiesMap,
): AnyAccount | undefined =>
  Object.values(walletsEntities)
    .reduce<AnyAccount[]>(
      (accounts, wallet) => [...accounts, ...wallet.accounts],
      [],
    )
    .find(accumulator => accumulator.accountId === accountId);

/**
 * Helper: Extract all tokens for a specific tokenId from an account
 */
export const extractAccountTokens = (
  accountTokensMap: AccountTokensMap,
  tokenId: string,
): RawToken[] =>
  Object.values(accountTokensMap)
    .filter(
      (addressTokens): addressTokens is Partial<Record<TokenId, RawToken>> =>
        addressTokens !== undefined,
    )
    .map(addressTokens => addressTokens[TokenId(tokenId)])
    .filter((token): token is RawToken => token !== undefined);

/**
 * Helper: Collect accounts with their tokens and metadata
 */
export const collectAccountsWithTokens = (
  rawTokensMap: Partial<Record<string, AccountTokensMap>>,
  tokenId: string,
  walletsEntities: WalletEntitiesMap,
): AccountWithTokens[] =>
  Object.entries(rawTokensMap)
    .filter(
      (entry): entry is [string, AccountTokensMap] => entry[1] !== undefined,
    )
    .map(([accountId, accountTokensMap]) => ({
      accountId,
      metadata: findAccountMetadata(accountId, walletsEntities),
      tokens: extractAccountTokens(accountTokensMap, tokenId),
    }))
    .filter(({ tokens }) => tokens.length > 0);

/**
 * Helper: Build distribution items from accounts with tokens
 */
export const buildDistribution = (
  accountsWithTokens: AccountWithTokens[],
  walletsEntities: WalletEntitiesMap,
): TokenDistributionItem[] =>
  accountsWithTokens
    .map(({ accountId, metadata, tokens }) => {
      const totalAvailable = BigIntMath.sum(
        tokens.map(token => BigInt(token.available)),
      );
      const balance = Number(totalAvailable);

      const walletId = metadata?.walletId || '';
      const wallet = walletId ? walletsEntities[walletId] : undefined;

      return {
        accountId,
        accountName: metadata?.metadata?.name,
        walletId,
        walletName: wallet?.metadata?.name,
        blockchainName: metadata?.blockchainName || 'Cardano',
        balance,
      };
    })
    .filter(({ balance }) => balance > 0);

/**
 * Helper: Calculate aggregated totals from all tokens
 */
export const calculateTotals = (
  accountsWithTokens: AccountWithTokens[],
): { totalAvailableStr: string; totalPendingStr: string } => {
  const allTokens = accountsWithTokens.flatMap(({ tokens }) => tokens);

  const totalAvailable = BigIntMath.sum(
    allTokens.map(token => BigInt(token.available)),
  );
  const totalPending = BigIntMath.sum(
    allTokens.map(token => BigInt(token.pending)),
  );

  return {
    totalAvailableStr: totalAvailable.toString(),
    totalPendingStr: totalPending.toString(),
  };
};

/**
 * Helper: Format token totals with metadata
 */
export const formatTokenTotals = ({
  tokenId,
  totalAvailableString,
  totalPendingString,
  tokensMetadata,
}: {
  tokenId: string;
  totalAvailableString: string;
  totalPendingString: string;
  tokensMetadata: Partial<Record<TokenId, TokenMetadata>>;
}): TokenTotalBalance => {
  const totalAvailableBigInt = BigInt(totalAvailableString);
  const totalPendingBigInt = BigInt(totalPendingString);
  const totalBigInt = totalAvailableBigInt + totalPendingBigInt;

  const totalAvailable = BigNumber(totalAvailableBigInt);
  const totalPending = BigNumber(totalPendingBigInt);
  const total = BigNumber(totalBigInt);

  const metadata = tokensMetadata[TokenId(tokenId)];
  const decimals = metadata?.decimals ?? 0;
  const displayDecimalPlaces = metadata?.displayDecimalPlaces;
  const displayShortName = metadata?.ticker ?? tokenId;
  const formattingDecimals = displayDecimalPlaces ?? decimals;

  // Format the total with the appropriate decimal places
  const totalNumber = Number(totalBigInt);
  const formattedCoinQuantity = totalNumber.toFixed(formattingDecimals);

  // TODO: Integrate market data provider to get the formatted total balance
  const formattedTotalBalance = '';
  const estimatedPrice = '';

  return {
    tokenId,
    available: totalAvailable,
    pending: totalPending,
    total,
    decimals,
    displayDecimalPlaces,
    displayShortName,
    formattedCoinQuantity,
    formattedTotalBalance,
    estimatedPrice,
  };
};
