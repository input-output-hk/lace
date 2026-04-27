import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';

import {
  DUST_TOKEN_TICKER,
  MidnightSDKNetworkIds,
  MidnightSDKTestNetworkId,
  NATIVE_TOKEN_DECIMALS,
  NIGHT_ICON,
  NIGHT_TOKEN_DECIMALS,
  NIGHT_TOKEN_ID,
  NIGHT_TOKEN_TICKER,
  TDUST_TOKEN_TICKER,
  TNIGHT_TOKEN_TICKER,
  type MidnightNetworkConfig,
  type MidnightNetworksConfig,
} from './const';
import { MidnightSDKNetworkId } from './const';

import type {
  MidnightAccountProps,
  MidnightCoinDetail,
  MidnightSpecificTokenMetadata,
  MidnightTokenKind,
} from './types';
import type { FeatureFlag } from '@lace-contract/feature';
import type { NetworkType } from '@lace-contract/network';
import type {
  Token,
  StoredTokenMetadata,
  RawTokenWithoutContext,
} from '@lace-contract/tokens';
import type {
  AnyAccount,
  AnyWallet,
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

export const convertHttpUrlToWebsocket = (url: string) =>
  `${url.replace(/(http)(s)?:\/\//, 'ws$2://')}/ws`;

// TODO: LW-13716 to be removed once Midnight starts to differentiate token types
//  by kind (shielded, unshielded). As of now shielded tokens have identical
//  types as unshielded
export const toUnshieldedTokenType = (
  type: string,
  networkId: MidnightSDKNetworkId,
) => `unshielded-${networkId}${type}`;
export const fromUnshieldedTokenType = (
  type: string,
  networkId: MidnightSDKNetworkId,
) => type.replace(`unshielded-${networkId}`, '');

export const isMidnightNetworkConfig = (
  item: unknown,
): item is MidnightNetworkConfig =>
  typeof item === 'object' &&
  item !== null &&
  'nodeAddress' in item &&
  'proofServerAddress' in item &&
  'indexerAddress' in item;

export const isPartialMidnightNetworkConfig = (
  item: unknown,
): item is Partial<MidnightNetworkConfig> => {
  return (
    typeof item === 'object' &&
    item !== null &&
    Object.keys(item).every(key =>
      ['nodeAddress', 'proofServerAddress', 'indexerAddress'].includes(key),
    )
  );
};

export const isMidnightNetworksConfig = (
  item: unknown,
): item is MidnightNetworksConfig => {
  if (typeof item !== 'object' || item === null) return false;

  const values = Object.values(item);

  return values.length > 0 && values.every(isMidnightNetworkConfig);
};

export const isPartialMidnightNetworksConfig = (
  item: unknown,
): item is Partial<MidnightNetworksConfig> =>
  typeof item === 'object' &&
  item !== null &&
  Object.values(item).every(isPartialMidnightNetworkConfig);

export const isInMemoryMidnightAccount = (
  account: AnyAccount,
): account is InMemoryWalletAccount<MidnightAccountProps> =>
  account.accountType === 'InMemory' && account.blockchainName === 'Midnight';

export const hasMidnightAccount = (
  wallet: AnyWallet,
): wallet is InMemoryWallet<MidnightAccountProps> => {
  return wallet.accounts.some(isInMemoryMidnightAccount);
};

export const isMidnightSDKNetworkId = (
  networkId: string,
): networkId is MidnightSDKNetworkId =>
  MidnightSDKNetworkId.includes(networkId as MidnightSDKNetworkId);

export const isMidnightSDKTestNetworkId = (
  networkId: string,
): networkId is MidnightSDKTestNetworkId =>
  MidnightSDKTestNetworkId.includes(networkId as MidnightSDKTestNetworkId);

export const isMidnightToken = (
  token: Token<unknown>,
): token is Token<MidnightSpecificTokenMetadata> =>
  token.blockchainName === 'Midnight';

export const isNightTokenTicker = (ticker: string): boolean =>
  [NIGHT_TOKEN_TICKER, TNIGHT_TOKEN_TICKER].includes(ticker);

export const getDustTokenIdByNetwork = (_networkId: MidnightSDKNetworkId) => {
  // midnight-context cannot import ledger to use ledger.dustToken().raw;
  // otherwise it breaks lace-mobile and lace-extension builds
  return TokenId('dust');
};

/** Maps Midnight SDK network id to Lace mainnet vs testnet (for display tickers). */
export const midnightNetworkIdToNetworkType = (
  networkId: MidnightSDKNetworkId,
): NetworkType =>
  networkId === MidnightSDKNetworkIds.MainNet ? 'mainnet' : 'testnet';

export const getDustTokenTickerByNetwork = (
  networkType: NetworkType | undefined,
): string =>
  networkType === 'testnet' ? TDUST_TOKEN_TICKER : DUST_TOKEN_TICKER;

export const getNightTokenTickerByNetwork = (
  networkType: NetworkType | undefined,
): string =>
  networkType === 'testnet' ? TNIGHT_TOKEN_TICKER : NIGHT_TOKEN_TICKER;

interface TokenBalances {
  available: bigint;
  pending: bigint;
}

export const createMidnightToken = (
  tokenType: string,
  balances: TokenBalances,
): RawTokenWithoutContext => {
  return {
    available: BigNumber(balances.available),
    tokenId: TokenId(tokenType),
    pending: BigNumber(balances.pending),
  };
};

export const isNightToken = (
  tokenType: string,
  networkId: MidnightSDKNetworkId,
): boolean => tokenType === toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId);

const createNightTokenMetadata = (
  kind: MidnightTokenKind,
  networkId: MidnightSDKNetworkId,
  coins?: MidnightCoinDetail[],
): StoredTokenMetadata<MidnightSpecificTokenMetadata> => ({
  tokenId: TokenId(toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId)),
  decimals: NIGHT_TOKEN_DECIMALS,
  name: NIGHT_TOKEN_TICKER,
  ticker: getNightTokenTickerByNetwork(
    midnightNetworkIdToNetworkType(networkId),
  ),
  image: NIGHT_ICON,
  blockchainSpecific: {
    kind,
    ...(coins ? { coins } : {}),
  },
});

export const createInitialMidnightTokenMetadata = ({
  tokenType,
  kind,
  coins,
  networkId,
}: {
  tokenType: string;
  kind: MidnightTokenKind;
  coins?: MidnightCoinDetail[];
  networkId: MidnightSDKNetworkId;
}): StoredTokenMetadata<MidnightSpecificTokenMetadata> => {
  if (isNightToken(tokenType, networkId)) {
    return createNightTokenMetadata(kind, networkId, coins);
  }

  return {
    tokenId: TokenId(tokenType),
    decimals: NATIVE_TOKEN_DECIMALS,
    blockchainSpecific: {
      kind,
      ...(coins ? { coins } : {}),
    },
  };
};

export type NetworkStringPayloadFeatureFlag = FeatureFlag<
  Partial<Record<MidnightSDKNetworkId, string>>
>;

const isNetworkStringPayloadFeatureFlag = (
  featureFlag: FeatureFlag,
): featureFlag is NetworkStringPayloadFeatureFlag =>
  featureFlag &&
  'payload' in featureFlag &&
  typeof featureFlag.payload === 'object' &&
  featureFlag.payload !== null;

export const getValidNetworkStringPayload = (
  supportedNetworkIds: MidnightSDKNetworkId[],
  featureFlag: FeatureFlag,
): NetworkStringPayloadFeatureFlag['payload'] => {
  if (!isNetworkStringPayloadFeatureFlag(featureFlag)) return {};

  const supported = supportedNetworkIds as string[];

  return Object.fromEntries(
    Object.entries(featureFlag.payload).filter(
      ([key, value]) => supported.includes(key) && typeof value === 'string',
    ),
  );
};

export type DustTankStatus = 'decaying' | 'empty' | 'filled' | 'refilling';

export const getDustTankStatus = (
  value: bigint,
  maxValue: bigint,
): DustTankStatus => {
  if (value === 0n && maxValue === 0n) {
    return 'empty';
  } else if (value < maxValue) {
    return 'refilling';
  } else if (value === maxValue) {
    return 'filled';
  } else {
    return 'decaying';
  }
};
