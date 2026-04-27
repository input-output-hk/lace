import {
  CardanoTokenPriceId,
  getTokenIdentifier,
  type TokenIdMapper,
  type TokenPriceRequest,
} from '@lace-contract/token-pricing';

import type { TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

const getTokenPriceId = (token: Token): TokenPriceId => {
  const identifier = getTokenIdentifier(token);
  return CardanoTokenPriceId(identifier);
};

const getTokenPriceRequest = (
  token: Token,
  fiatCurrency: string,
): TokenPriceRequest => {
  const identifier = getTokenIdentifier(token);

  return {
    priceId: CardanoTokenPriceId(identifier),
    blockchain: 'Cardano',
    identifier,
    fiatCurrency,
  };
};

export const createTokenIdMapper = (): TokenIdMapper => ({
  blockchainName: 'Cardano',
  getTokenPriceId,
  getTokenPriceRequest,
});

export default createTokenIdMapper;
