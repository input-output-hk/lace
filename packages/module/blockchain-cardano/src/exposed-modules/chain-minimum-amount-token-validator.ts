import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';

import type { ChainMinimumAmountTokenValidator } from '@lace-contract/send-flow';

const LOVELACE_PER_ADA = 10 ** ADA_DECIMALS;

export const createChainMinimumAmountTokenValidator =
  (): ChainMinimumAmountTokenValidator => ({
    blockchainName: 'Cardano',
    hasChainMinimumAmount: token => token.tokenId === LOVELACE_TOKEN_ID,
    formatMinimumAmount: minimumAmount =>
      (Number(minimumAmount) / LOVELACE_PER_ADA).toString(),
  });

export default createChainMinimumAmountTokenValidator;
