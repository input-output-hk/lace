import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  CardanoNetworkId,
  cardanoNetworkIdToNetworkType,
  cardanoNetworkMagicToNetworkType,
} from '../src';

describe('cardanoNetworkMagicToNetworkType', () => {
  it('returns mainnet for mainnet network magic', () => {
    expect(
      cardanoNetworkMagicToNetworkType(Cardano.NetworkMagics.Mainnet),
    ).toBe('mainnet');
  });

  it('returns testnet for preprod magic', () => {
    expect(
      cardanoNetworkMagicToNetworkType(Cardano.NetworkMagics.Preprod),
    ).toBe('testnet');
  });
});

describe('cardanoNetworkIdToNetworkType', () => {
  it('matches magic helper for a known Cardano network id', () => {
    const id = CardanoNetworkId(Cardano.NetworkMagics.Mainnet);
    expect(cardanoNetworkIdToNetworkType(id)).toBe('mainnet');
    expect(cardanoNetworkIdToNetworkType(CardanoNetworkId(1))).toBe('testnet');
  });
});
