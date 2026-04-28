import {
  BitcoinTokenPriceId,
  getTokenIdentifier,
  type TokenIdMapper,
  type TokenPriceRequest,
} from '@lace-contract/token-pricing';

import type { TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

const getTokenPriceId = (token: Token): TokenPriceId => {
  const identifier = getTokenIdentifier(token);
  return BitcoinTokenPriceId(identifier);
};

const getTokenPriceRequest = (
  token: Token,
  fiatCurrency: string,
): TokenPriceRequest => {
  const identifier = getTokenIdentifier(token);
  return {
    priceId: BitcoinTokenPriceId(identifier),
    blockchain: 'Bitcoin',
    identifier,
    fiatCurrency,
  };
};

export const createTokenIdMapper = (): TokenIdMapper => ({
  blockchainName: 'Bitcoin',
  getTokenPriceId,
  getTokenPriceRequest,
});

export default createTokenIdMapper;
