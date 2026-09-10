import { Cardano, Serialization } from '@cardano-sdk/core';
import { util } from '@cardano-sdk/key-management';
import { of } from 'rxjs';
import { beforeAll, describe, expect, it } from 'vitest';

import { deriveTestAccount } from './account';
import { returnFunds } from './tx';

import type { DerivedAccount } from './account';
import type { Providers } from './queries';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';

const protocolParameters: RequiredProtocolParameters = {
  coinsPerUtxoByte: 4310,
  collateralPercentage: 150,
  desiredNumberOfPools: 500,
  dRepDeposit: 500_000_000,
  maxCollateralInputs: 3,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  minFeeRefScriptCostPerByte: '15.0',
  monetaryExpansion: '3.0/1000.0',
  poolDeposit: 500_000_000,
  poolInfluence: '3.0/10.0',
  prices: { memory: 0.0577, steps: 0.0000721 },
  stakeKeyDeposit: 2_000_000,
};

const assetId = Cardano.AssetId(
  'e0f0d0d0f0e0d0f0e0d0f0e0d0f0e0d0f0e0d0f0e0d0f0e0d0f0e0d04c414345',
);

const utxoKey = (txIn: Cardano.TxIn): string => `${txIn.txId}#${txIn.index}`;

const mkUtxo = (
  txId: string,
  address: Cardano.PaymentAddress,
  value: Cardano.Value,
): Cardano.Utxo => [
  { txId: Cardano.TransactionId(txId), index: 0, address },
  { address, value } as Cardano.TxOut,
];

/**
 * An in-memory chain that applies a submitted tx: spent inputs disappear, the
 * tx's outputs become utxos at their own addresses. Enough to observe what a
 * built tx actually consumes, which is the whole question here.
 */
const makeChain = (initial: Cardano.Utxo[]) => {
  let utxos = [...initial];
  const at = (address: Cardano.PaymentAddress): Cardano.Utxo[] =>
    utxos.filter(([, out]) => out.address === address);
  const providers = {
    utxo: {
      getUtxosAtAddress: ({ address }: { address: Cardano.PaymentAddress }) =>
        of({ unwrap: () => at(address) }),
    },
    networkInfo: { protocolParameters: async () => protocolParameters },
    txSubmit: {
      submitTx: async ({
        signedTransaction,
      }: {
        signedTransaction: string;
      }) => {
        const { body, id } = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(signedTransaction),
        ).toCore();
        const spent = new Set(body.inputs.map(input => utxoKey(input)));
        utxos = [
          ...utxos.filter(([txIn]) => !spent.has(utxoKey(txIn))),
          ...body.outputs.map(
            (out, index): Cardano.Utxo => [
              { txId: id, index, address: out.address },
              out,
            ],
          ),
        ];
        return id;
      },
    },
  } as unknown as Providers;
  return { providers, at };
};

describe('returnFunds', () => {
  let source: DerivedAccount;
  let treasury: DerivedAccount;

  beforeAll(async () => {
    const chainId = Cardano.ChainIds.Preprod;
    source = await deriveTestAccount({
      mnemonic: util.generateMnemonicWords(),
      chainId,
      accountIndex: 0,
    });
    treasury = await deriveTestAccount({
      mnemonic: util.generateMnemonicWords(),
      chainId,
      accountIndex: 0,
    });
  });

  it('drains a source holding both a pure-ADA and an asset-bearing utxo', async () => {
    // Both utxos, not one: a single-utxo source drains under any input strategy,
    // so it cannot tell coin selection apart from an explicit full drain.
    const { providers, at } = makeChain([
      mkUtxo('a'.repeat(64), source.address, { coins: 50_000_000n }),
      mkUtxo('b'.repeat(64), source.address, {
        coins: 3_000_000n,
        assets: new Map([[assetId, 1n]]),
      }),
    ]);

    await returnFunds(providers, { from: source, to: treasury.address });

    expect(at(source.address)).toHaveLength(0);
    expect(
      at(treasury.address).some(([, out]) => out.value.assets?.get(assetId)),
    ).toBe(true);
  });
});
