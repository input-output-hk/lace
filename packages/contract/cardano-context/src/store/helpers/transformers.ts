import { Cardano } from '@cardano-sdk/core';
import BigNumber from 'bignumber.js';

import { getFallbackAsset } from './get-fallback-asset';
import { getAccountAddresses } from './group-cardano-addresses-by-account';

import type {
  CoinItemProps,
  AssetMetadataMap,
  CardanoRewardAccount,
} from '../../types';
import type { CardanoTokenMetadata } from '../../types';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { TokenMetadata } from '@lace-contract/tokens';

const BASE = 10;

type ActivityContext = {
  activity: Required<Pick<Activity, 'accountId'>>;
  chainId: Cardano.ChainId;
  addresses: AnyAddress[];
};

export type AccountInfo = {
  rewardAccount: CardanoRewardAccount;
  accountPaymentAddresses: Cardano.PaymentAddress[];
};

export const calculateAssetBalance = (
  balance: bigint,
  tokenInfo?: Pick<TokenMetadata, 'decimals' | 'isNft'>,
): string => {
  const decimals = tokenInfo?.decimals;
  if (tokenInfo?.isNft || !decimals) return balance.toString();

  return new BigNumber(balance.toString())
    .div(new BigNumber(BASE).pow(decimals))
    .toString();
};

/**
 * Transforms token metadata and asset balance into a CoinItemProps object for UI display
 */
export const assetToCoinItemTransformer = (
  tokenMetadata: TokenMetadata<CardanoTokenMetadata>,
  assetBalance: [Cardano.AssetId, bigint],
): CoinItemProps => {
  const { name, ticker, image } = tokenMetadata;
  const [assetId, bigintBalance] = assetBalance;
  const amount = calculateAssetBalance(bigintBalance, tokenMetadata);
  const { fingerprint } = getFallbackAsset(assetId);

  return {
    id: assetId.toString(),
    amount,
    name: name ?? fingerprint.toString(),
    symbol: name ?? ticker ?? fingerprint.toString(),
    logo: image ?? '',
  };
};

/**
 * Transforms assets metadata into an array of CoinItemProps for storing activity details
 * @param tokenMap - Map of asset IDs to their balances
 * @param assetMetadataMap - Map of asset IDs to their metadata
 * @returns Array of CoinItemProps for activity details storage
 */
export const transformTokenMap = (
  tokenMap: Cardano.TokenMap,
  assetMetadataMap: AssetMetadataMap,
): CoinItemProps[] => {
  if (!tokenMap) return [];

  const transformed: CoinItemProps[] = [];

  for (const [id, amount] of tokenMap) {
    const token = assetMetadataMap.get(id);
    // Do not display token if we don't have the info yet
    if (token) {
      transformed.push(assetToCoinItemTransformer(token, [id, amount]));
    }
  }

  return transformed;
};

/**
 * Extracts account information from activity context
 */
export const extractAccountInfo = ({
  activity: { accountId },
  chainId,
  addresses,
}: ActivityContext): AccountInfo | null => {
  const accountAddresses = getAccountAddresses(addresses, accountId, chainId);
  const rewardAccount = accountAddresses[0]?.data?.rewardAccount;

  if (rewardAccount === undefined) {
    return null;
  }

  const accountPaymentAddresses = accountAddresses.map(address =>
    Cardano.PaymentAddress(address.address),
  );

  return {
    rewardAccount,
    accountPaymentAddresses,
  };
};
