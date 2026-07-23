import {
  BitcoinTokenPriceId,
  getTokenIdentifier,
  type TokenIdMapper,
  type TokenPriceRequest,
} from '@lace-contract/token-pricing';

import type { TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

const getTokenPriceId = (token: Token): TokenPriceId =>
  BitcoinTokenPriceId(token.tokenId);

const getTokenPriceRequest = (
  token: Token,
  fiatCurrency: string,
): TokenPriceRequest => ({
  priceId: BitcoinTokenPriceId(token.tokenId),
  blockchain: 'Bitcoin',
  identifier: getTokenIdentifier(token),
  fiatCurrency,
});

export const createTokenIdMapper = (): TokenIdMapper => ({
  blockchainName: 'Bitcoin',
  getTokenPriceId,
  getTokenPriceRequest,
});

export default createTokenIdMapper;
