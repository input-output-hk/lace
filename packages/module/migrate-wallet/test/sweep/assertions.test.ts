import { Cardano } from '@cardano-sdk/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { testAssetId } from '../cardano/mint';

import { destinationHoldsAssets, destinationHoldsToken } from './assertions';

import type { Providers } from '../cardano/queries';

const ADDRESS = 'addr_test_destination' as Cardano.PaymentAddress;
const TX_ID = 'a'.repeat(64);
const ASSET = testAssetId('guard-probe-1');
const OTHER_ASSET = testAssetId('guard-probe-2');

// Only the utxo query is reachable: every guard under test throws before it.
const providersHolding = (utxos: Cardano.Utxo[]): Providers =>
  ({
    utxo: { getUtxosAtAddress: () => of({ unwrap: () => utxos }) },
  } as unknown as Providers);

const sweepOutputHolding = (
  assets: [Cardano.AssetId, bigint][],
): Cardano.Utxo => [
  { txId: Cardano.TransactionId(TX_ID), index: 0, address: ADDRESS },
  {
    address: ADDRESS,
    value: { coins: 2_000_000n, assets: new Map(assets) },
  },
];

describe('destinationHoldsToken', () => {
  it('throws when the staged quantity is zero, naming the asset', async () => {
    await expect(
      destinationHoldsToken(providersHolding([]), {
        address: ADDRESS,
        txId: TX_ID,
        assetId: ASSET,
        expected: 0n,
      }),
    ).rejects.toThrow(`staged quantity of ${ASSET} is 0`);
  });

  it('throws when the staged quantity is negative', async () => {
    await expect(
      destinationHoldsToken(providersHolding([]), {
        address: ADDRESS,
        txId: TX_ID,
        assetId: ASSET,
        expected: -1n,
      }),
    ).rejects.toThrow(`staged quantity of ${ASSET} is -1`);
  });

  it('reaches the chain read for a positive quantity', async () => {
    const result = await destinationHoldsToken(
      providersHolding([sweepOutputHolding([[ASSET, 3n]])]),
      { address: ADDRESS, txId: TX_ID, assetId: ASSET, expected: 3n },
    );

    expect(result).toEqual({
      label: 'destination received the token (x3)',
      didPass: true,
    });
  });
});

describe('destinationHoldsAssets', () => {
  it('throws when nothing was staged', async () => {
    await expect(
      destinationHoldsAssets(providersHolding([]), {
        address: ADDRESS,
        txId: TX_ID,
        expected: [],
      }),
    ).rejects.toThrow('no assets staged');
  });

  it('throws when a staged quantity is not positive, naming the asset', async () => {
    await expect(
      destinationHoldsAssets(providersHolding([]), {
        address: ADDRESS,
        txId: TX_ID,
        expected: [
          { assetId: ASSET, quantity: 1n },
          { assetId: OTHER_ASSET, quantity: 0n },
        ],
      }),
    ).rejects.toThrow(`staged quantity of ${OTHER_ASSET} is 0`);
  });

  it('reaches the chain read for a positive expectation, one assertion per asset', async () => {
    const results = await destinationHoldsAssets(
      providersHolding([
        sweepOutputHolding([
          [ASSET, 1n],
          [OTHER_ASSET, 2n],
        ]),
      ]),
      {
        address: ADDRESS,
        txId: TX_ID,
        expected: [
          { assetId: ASSET, quantity: 1n },
          { assetId: OTHER_ASSET, quantity: 2n },
        ],
      },
    );

    expect(results).toEqual([
      { label: `destination received ${ASSET} (x1)`, didPass: true },
      { label: `destination received ${OTHER_ASSET} (x2)`, didPass: true },
    ]);
  });
});
