import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { CardanoCustodyWalletId } from '../../src';

const STAKE_SCRIPT_HASH = Hash28ByteBase16(
  '870834b0c398c72eadd2ca6250ecbca46cd3dca8a590cb416668eb4f',
);

describe('value-objects/cardano-custody-wallet-id', () => {
  it('derives the walletId from the network magic and the stake script hash', () => {
    expect(
      CardanoCustodyWalletId.derive(
        Cardano.NetworkMagics.Preprod,
        STAKE_SCRIPT_HASH,
      ),
    ).toBe('343453efe1016acfd8289987f10ae0ac');
    expect(
      CardanoCustodyWalletId.derive(
        Cardano.NetworkMagics.Mainnet,
        STAKE_SCRIPT_HASH,
      ),
    ).toBe('9048acf0e2d8c42fd49c376b2c1bb1b1');
  });

  it('derives a separate wallet on each network for one stake script hash', () => {
    expect(
      CardanoCustodyWalletId.derive(
        Cardano.NetworkMagics.Preview,
        STAKE_SCRIPT_HASH,
      ),
    ).toBe('609937c6d499fe7c9b98f0766acdd961');
  });

  it('ignores the case of the stake script hash', () => {
    expect(
      CardanoCustodyWalletId.derive(
        Cardano.NetworkMagics.Preprod,
        STAKE_SCRIPT_HASH.toUpperCase() as Hash28ByteBase16,
      ),
    ).toBe(
      CardanoCustodyWalletId.derive(
        Cardano.NetworkMagics.Preprod,
        STAKE_SCRIPT_HASH,
      ),
    );
  });
});
