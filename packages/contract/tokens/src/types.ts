import type { TokenId } from './';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BigNumber } from '@lace-lib/util';
import type { BlockchainAssigned } from '@lace-lib/util-store';

type BlockchainSpecificMetadataPart<BlockchainSpecificMetadata = unknown> = {
  blockchainSpecific: BlockchainSpecificMetadata;
};

type RequiredMetadata<BlockchainSpecificMetadata = unknown> =
  BlockchainSpecificMetadataPart<BlockchainSpecificMetadata> & {
    /**
     *
     * Decimals determines the smallest unit of the token
     *
     * @example token with decimals set to 6 equals 1.000.000 units, the smallest unit is 0.000001
     * @example token with decimals set to 1 equals 10 units, the smallest unit is 0.1
     * @example token with decimals set to 0 equals 1 unit, the smallest unit is 1
     */
    decimals: number;
    /**
     * Determines how many decimal places will be rendered.
     */
    displayDecimalPlaces?: number;
    image?: string;
    isNft?: boolean;
    additionalProperties?: Record<string, TokenMetadataValue>;
  };

export type TokenMetadataValue =
  | TokenMetadataValue[]
  | boolean
  | number
  | string
  | { [key: string]: TokenMetadataValue }
  | null;

/** Where a token balance is held: its account, address and blockchain. */
export type TokenContextData = BlockchainAssigned<{
  accountId: AccountId;
  address: Address;
}>;

type TokenNameData = {
  name: string;
  ticker: string;
};

/**
 * A token balance without its holder: the token ID and its `available` and
 * `pending` amounts in the token's smallest unit.
 */
export type RawTokenWithoutContext = {
  tokenId: TokenId;
  available: BigNumber;
  pending: BigNumber;
};

/**
 * A token balance of one account at one address, as the chain reports it:
 * `available` and `pending` amounts in the token's smallest unit.
 */
export type RawToken = RawTokenWithoutContext & TokenContextData;

export type TokenMetadata<BlockchainSpecificMetadata = unknown> =
  Partial<TokenNameData> & RequiredMetadata<BlockchainSpecificMetadata>;

/** A token balance with its metadata and display names and decimals, as wallet state shows it. */
export type Token<BlockchainSpecificMetadata = unknown> = RawToken & {
  metadata?: TokenMetadata<BlockchainSpecificMetadata>;
  unnamed?: boolean;
  displayLongName: string;
  displayShortName: string;
  decimals: number;
  displayDecimalPlaces?: number;
};

/**
 * A token's metadata as the wallet stores it, keyed by its token ID.
 *
 * @typeParam BlockchainSpecificMetadata - The shape of the chain-specific metadata.
 */
export type StoredTokenMetadata<BlockchainSpecificMetadata = unknown> = Pick<
  RawToken,
  'tokenId'
> &
  TokenMetadata<BlockchainSpecificMetadata>;
