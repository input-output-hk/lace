import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';

import type { BaseTokenSelector } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';

const isAdaTokenId = (token: Token) => token.tokenId === LOVELACE_TOKEN_ID;

export const createBaseTokenSelector = (): BaseTokenSelector => ({
  blockchainName: 'Cardano',
  selectBaseToken: (tokens: Token[]) => tokens.find(isAdaTokenId),
});

export default createBaseTokenSelector;
