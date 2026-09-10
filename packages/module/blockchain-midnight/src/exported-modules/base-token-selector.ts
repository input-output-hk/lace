import { isNightTokenTicker } from '@lace-contract/midnight-context';

import type { BaseTokenSelector } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';

const hasNightTicker = (token: Token) =>
  isNightTokenTicker(token.metadata?.ticker ?? '');

export const createBaseTokenSelector = (): BaseTokenSelector => ({
  blockchainName: 'Midnight',
  selectBaseToken: (tokens: Token[]) => tokens.find(hasNightTicker),
});

export default createBaseTokenSelector;
