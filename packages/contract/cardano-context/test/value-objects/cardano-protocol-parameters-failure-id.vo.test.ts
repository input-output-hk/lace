import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  CardanoNetworkId,
  CardanoProtocolParametersFailureId,
} from '../../src/value-objects';

describe('CardanoProtocolParametersFailureId', () => {
  it('constructs an ID with the expected prefix', () => {
    const network = CardanoNetworkId(Cardano.ChainIds.Mainnet.networkMagic);
    const id = CardanoProtocolParametersFailureId(network);
    expect(id).toBe(`cardano-protocol-parameters-${network}`);
  });
});
