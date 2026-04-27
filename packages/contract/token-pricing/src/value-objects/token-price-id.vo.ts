import type { BlockchainName } from '@lace-lib/util-store';
import type { Tagged } from 'type-fest';

/**
 * Unique identifier for a token price entry, agnostic of fiat currency.
 * Format: `{blockchain}:{identifier}`
 */
export type TokenPriceId = Tagged<string, 'TokenPriceId'>;

export const TokenPriceId = (
  blockchain: BlockchainName,
  identifier: string,
): TokenPriceId => {
  return `${blockchain.toLowerCase()}:${identifier.toLowerCase()}` as TokenPriceId;
};

export const CardanoTokenPriceId = (identifier: string): TokenPriceId => {
  return TokenPriceId('Cardano', identifier.replace(/\s+/g, '-'));
};

export const BitcoinTokenPriceId = (identifier: string): TokenPriceId => {
  return TokenPriceId('Bitcoin', identifier.replace(/\s+/g, '-'));
};
