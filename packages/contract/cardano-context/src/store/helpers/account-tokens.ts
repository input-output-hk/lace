import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';

import { LOVELACE_TOKEN_ID } from '../../const';

import type { Cardano } from '@cardano-sdk/core';

/** Tokens of one address: its value, with `rewards` added to the lovelace. */
export const toAccountTokens = (value: Cardano.Value, rewards: bigint) => [
  {
    tokenId: LOVELACE_TOKEN_ID,
    available: BigNumber(value.coins + rewards),
    pending: BigNumber(0n),
  },
  ...[...(value.assets?.entries() || [])].map(([assetId, quantity]) => ({
    tokenId: TokenId(assetId),
    available: BigNumber(quantity),
    pending: BigNumber(0n),
  })),
];
