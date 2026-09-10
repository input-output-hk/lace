import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { estimateDaysUntilFirstReward } from '../src/reward-timing';

describe('estimateDaysUntilFirstReward', () => {
  it('estimates ~20 days on the 5-day-epoch networks (mainnet, preprod)', () => {
    expect(estimateDaysUntilFirstReward(Cardano.ChainIds.Mainnet)).toBe(20);
    expect(estimateDaysUntilFirstReward(Cardano.ChainIds.Preprod)).toBe(20);
  });

  it('estimates ~4 days on Preview, whose epochs are 1 day long', () => {
    expect(estimateDaysUntilFirstReward(Cardano.ChainIds.Preview)).toBe(4);
  });

  it('returns undefined for a network with no known slot configuration', () => {
    expect(
      estimateDaysUntilFirstReward({
        networkId: Cardano.NetworkId.Testnet,
        networkMagic: 999_999 as Cardano.NetworkMagic,
      }),
    ).toBeUndefined();
  });
});
