import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  CardanoEraSummariesFailureId,
  CardanoNetworkId,
} from '../../src/value-objects';

describe('CardanoEraSummariesFailureId', () => {
  it('constructs an ID with the expected prefix', () => {
    const network = CardanoNetworkId(Cardano.ChainIds.Mainnet.networkMagic);
    const id = CardanoEraSummariesFailureId(network);
    expect(id).toBe(`cardano-era-summaries-${network}`);
  });
});
