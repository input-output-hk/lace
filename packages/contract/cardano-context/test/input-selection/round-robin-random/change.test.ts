import { describe, expect, it } from 'vitest';

import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../../src/input-selection/InputSelectionError';
import { generateChangeWithRetries } from '../../../src/input-selection/round-robin-random/change';

import type { CoinSelectorProtocolParameters } from '../../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g' as Cardano.PaymentAddress;
const changeAddress =
  'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk' as Cardano.PaymentAddress;

const policyId = '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882';
const ASSET_A = `${policyId}${Buffer.from('assetA').toString(
  'hex',
)}` as Cardano.AssetId;

const protocolParameters: CoinSelectorProtocolParameters = {
  coinsPerUtxoByte: 0,
  maxValueSize: 0,
};

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

describe('generateChangeWithRetries', () => {
  it('throws BalanceInsufficient when the selection does not cover the target coins', () => {
    const act = () =>
      generateChangeWithRetries(
        {
          selection: [utxo(0, 100n)],
          targetValue: { coins: 200n },
          changeAddress,
          protocolParameters,
        },
        () => undefined,
        0,
      );

    expect(act).toThrow('missing 100 lovelace');
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('throws BalanceInsufficient when the selection does not cover a target asset', () => {
    const act = () =>
      generateChangeWithRetries(
        {
          selection: [utxo(0, 1_000n, new Map([[ASSET_A, 1n]]))],
          targetValue: { coins: 500n, assets: new Map([[ASSET_A, 5n]]) },
          changeAddress,
          protocolParameters,
        },
        () => undefined,
        0,
      );

    expect(act).toThrow(`missing 4 of asset ${ASSET_A}`);
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('throws when a picker that never signals exhaustion exceeds the pool bound', () => {
    let picks = 0;
    const act = () =>
      generateChangeWithRetries(
        {
          selection: [utxo(0, 10n)],
          targetValue: { coins: 0n },
          changeAddress,
          protocolParameters: { coinsPerUtxoByte: 4310, maxValueSize: 0 },
        },
        () => utxo(++picks, 1n),
        3,
      );

    expect(act).toThrow(
      'Change generation exceeded the UTxO pool bound of 3 additional picks',
    );
  });
});
