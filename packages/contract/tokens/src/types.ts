import type { TokenId } from './';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BlockchainAssigned } from '@lace-lib/util-store';
import type { BigNumber } from '@lace-sdk/util';

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
    additionalProperties?: Record<string, string>;
  };

export type TokenContextData = BlockchainAssigned<{
  accountId: AccountId;
  address: Address;
}>;

type TokenNameData = {
  name: string;
  ticker: string;
};

export type RawTokenWithoutContext = {
  tokenId: TokenId;
  available: BigNumber;
  pending: BigNumber;
};

export type RawToken = RawTokenWithoutContext & TokenContextData;

export type TokenMetadata<BlockchainSpecificMetadata = unknown> =
  Partial<TokenNameData> & RequiredMetadata<BlockchainSpecificMetadata>;

export type Token<BlockchainSpecificMetadata = unknown> = RawToken & {
  metadata?: TokenMetadata<BlockchainSpecificMetadata>;
  unnamed?: boolean;
  displayLongName: string;
  displayShortName: string;
  decimals: number;
  displayDecimalPlaces?: number;
};

export type StoredTokenMetadata<BlockchainSpecificMetadata = unknown> = Pick<
  RawToken,
  'tokenId'
> &
  TokenMetadata<BlockchainSpecificMetadata>;
