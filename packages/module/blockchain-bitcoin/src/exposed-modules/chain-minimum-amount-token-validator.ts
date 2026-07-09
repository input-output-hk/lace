import {
  BITCOIN_DECIMALS,
  BITCOIN_TOKEN_ID,
} from '@lace-contract/bitcoin-context';

import type { ChainMinimumAmountTokenValidator } from '@lace-contract/send-flow';

const SATOSHIS_PER_BTC = 10 ** BITCOIN_DECIMALS;

export const createChainMinimumAmountTokenValidator =
  (): ChainMinimumAmountTokenValidator => ({
    blockchainName: 'Bitcoin',
    hasChainMinimumAmount: token => token.tokenId === BITCOIN_TOKEN_ID,
    formatMinimumAmount: minimumAmount =>
      (Number(minimumAmount) / SATOSHIS_PER_BTC).toString(),
  });

export default createChainMinimumAmountTokenValidator;
