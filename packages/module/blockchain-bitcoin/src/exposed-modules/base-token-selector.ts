import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';

import type { BaseTokenSelector } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';

const isBitcoinTokenId = (token: Token) => token.tokenId === BITCOIN_TOKEN_ID;

export const createBaseTokenSelector = (): BaseTokenSelector => ({
  blockchainName: 'Bitcoin',
  selectBaseToken: (tokens: Token[]) => tokens.find(isBitcoinTokenId),
});

export default createBaseTokenSelector;
