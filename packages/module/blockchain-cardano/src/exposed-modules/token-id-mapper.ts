import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import {
  CardanoTokenPriceId,
  getTokenIdentifier,
  type TokenIdMapper,
  type TokenPriceRequest,
  type TokenPriceId,
} from '@lace-contract/token-pricing';

import type { Token } from '@lace-contract/tokens';

const getTokenPriceId = (token: Token): TokenPriceId =>
  CardanoTokenPriceId(token.tokenId);

const getTokenPriceRequest = (
  token: Token,
  fiatCurrency: string,
): TokenPriceRequest => ({
  priceId: CardanoTokenPriceId(token.tokenId),
  blockchain: 'Cardano',
  // identifier stays the ticker (the provider symbol-matches native coins by
  // it), so it diverges from the tokenId-keyed priceId for non-ADA tokens.
  identifier: getTokenIdentifier(token),
  // ADA (lovelace) is the native coin, matched by ticker, so it has none.
  contractAddress:
    token.tokenId === LOVELACE_TOKEN_ID ? undefined : token.tokenId,
  fiatCurrency,
});

export const createTokenIdMapper = (): TokenIdMapper => ({
  blockchainName: 'Cardano',
  getTokenPriceId,
  getTokenPriceRequest,
});

export default createTokenIdMapper;
