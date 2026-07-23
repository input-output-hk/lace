import { describe, expect, it } from 'vitest';

import { buildChangeOutputs } from '../../src/input-selection/change-builder';
import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../src/input-selection/InputSelectionError';

import type { Cardano } from '@cardano-sdk/core';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g' as Cardano.PaymentAddress;
const changeAddress =
  'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk' as Cardano.PaymentAddress;

const policyId = '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882';
const assetId = (name: string): Cardano.AssetId =>
  `${policyId}${Buffer.from(name).toString('hex')}` as Cardano.AssetId;
const ASSET_A = assetId('assetA');
const ASSET_B = assetId('assetB');

const utxo = (
  index: number,
  coins: bigint,
  assets?: Cardano.TokenMap,
): Cardano.Utxo => [
  { txId: 't'.repeat(64) as Cardano.TransactionId, index, address },
  { address, value: { coins, assets } },
];

const expectFailure = (
  act: () => void,
  failure: InputSelectionFailure,
): void => {
  let caught: unknown;
  try {
    act();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(InputSelectionError);
  expect((caught as InputSelectionError).failure).toBe(failure);
};

describe('buildChangeOutputs', () => {
  it('throws BalanceInsufficient when the selection does not cover the target coins', () => {
    expectFailure(
      () =>
        buildChangeOutputs({
          selection: [utxo(0, 100n)],
          remaining: [],
          targetValue: { coins: 200n },
          changeAddress,
          protocolParameters: { coinsPerUtxoByte: 0, maxValueSize: 0 },
        }),
      InputSelectionFailure.BalanceInsufficient,
    );
  });

  it('throws BalanceInsufficient when the selection does not cover a target asset', () => {
    expectFailure(
      () =>
        buildChangeOutputs({
          selection: [utxo(0, 1_000n, new Map([[ASSET_A, 1n]]))],
          remaining: [],
          targetValue: { coins: 500n, assets: new Map([[ASSET_A, 5n]]) },
          changeAddress,
          protocolParameters: { coinsPerUtxoByte: 0, maxValueSize: 0 },
        }),
      InputSelectionFailure.BalanceInsufficient,
    );
  });

  it('emits asset-only change when the selection coins match the target exactly', () => {
    const { changeOutputs } = buildChangeOutputs({
      selection: [utxo(0, 1_000n, new Map([[ASSET_A, 5n]]))],
      remaining: [],
      targetValue: { coins: 1_000n, assets: new Map([[ASSET_A, 2n]]) },
      changeAddress,
      protocolParameters: { coinsPerUtxoByte: 0, maxValueSize: 0 },
    });

    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.coins).toBe(0n);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(3n);
  });

  it('keeps a single-asset part even when it alone exceeds maxValueSize', () => {
    const { changeOutputs } = buildChangeOutputs({
      selection: [
        utxo(
          0,
          10_000_000n,
          new Map([
            [ASSET_A, 5n],
            [ASSET_B, 5n],
          ]),
        ),
      ],
      remaining: [],
      targetValue: { coins: 1_000_000n },
      changeAddress,
      protocolParameters: { coinsPerUtxoByte: 4310, maxValueSize: 30 },
    });

    expect(changeOutputs).toHaveLength(2);
    for (const change of changeOutputs) {
      expect(change.value.assets?.size).toBe(1);
    }
  });
});
