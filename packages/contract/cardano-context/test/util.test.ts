import { Cardano } from '@cardano-sdk/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { COLLATERAL_AMOUNT_LOVELACES } from '../src/const';
import { filterSpendableUtxos, getEligibleCollateralUtxo } from '../src/util';

const makeUtxo = (txId: string, index: number, coins: bigint): Cardano.Utxo =>
  [
    {
      address: Cardano.PaymentAddress(
        'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
      ),
      txId: Cardano.TransactionId(txId),
      index,
    },
    {
      address: Cardano.PaymentAddress(
        'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
      ),
      value: { coins },
    },
  ] as Cardano.Utxo;

describe('filterSpendableUtxos', () => {
  const utxoA = makeUtxo(
    '0000000000000000000000000000000000000000000000000000000000000001',
    0,
    5_000_000n,
  );
  const utxoB = makeUtxo(
    '0000000000000000000000000000000000000000000000000000000000000002',
    1,
    10_000_000n,
  );
  const utxoC = makeUtxo(
    '0000000000000000000000000000000000000000000000000000000000000003',
    2,
    3_000_000n,
  );

  it('returns all utxos when unspendable is empty', () => {
    const result = filterSpendableUtxos([utxoA, utxoB, utxoC], []);
    expect(result).toEqual([utxoA, utxoB, utxoC]);
  });

  it('filters out unspendable utxos', () => {
    const result = filterSpendableUtxos([utxoA, utxoB, utxoC], [utxoB]);
    expect(result).toEqual([utxoA, utxoC]);
  });

  it('filters out multiple unspendable utxos', () => {
    const result = filterSpendableUtxos([utxoA, utxoB, utxoC], [utxoA, utxoC]);
    expect(result).toEqual([utxoB]);
  });

  it('returns empty when all utxos are unspendable', () => {
    const result = filterSpendableUtxos([utxoA, utxoB], [utxoA, utxoB]);
    expect(result).toEqual([]);
  });

  it('returns all utxos when none match unspendable', () => {
    const result = filterSpendableUtxos([utxoA, utxoB], [utxoC]);
    expect(result).toEqual([utxoA, utxoB]);
  });

  it('returns empty when utxos is empty', () => {
    const result = filterSpendableUtxos([], [utxoA]);
    expect(result).toEqual([]);
  });
});

describe('getEligibleCollateralUtxo', () => {
  let pureAdaUtxo: Cardano.Utxo;
  let utxoWithAssets: Cardano.Utxo;
  let smallUtxo: Cardano.Utxo;
  let largeUtxo: Cardano.Utxo;

  beforeEach(() => {
    // Create a pure ADA UTXO with enough collateral
    pureAdaUtxo = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
        ),
        index: 0,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(COLLATERAL_AMOUNT_LOVELACES),
          assets: undefined,
        },
      },
    ] as Cardano.Utxo;

    // Create a UTXO with native tokens
    utxoWithAssets = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
        ),
        index: 1,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(COLLATERAL_AMOUNT_LOVELACES),
          assets: new Map([
            [
              Cardano.AssetId(
                '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
              ),
              BigInt(100),
            ],
          ]),
        },
      },
    ] as Cardano.Utxo;

    // Create a UTXO with insufficient ADA
    smallUtxo = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '5d5e78bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b50',
        ),
        index: 2,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(1_000_000), // 1 ADA, less than minimum
          assets: undefined,
        },
      },
    ] as Cardano.Utxo;

    // Create a UTXO with more than minimum ADA
    largeUtxo = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '6e6f89bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b51',
        ),
        index: 3,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(10_000_000), // 10 ADA, more than minimum
          assets: undefined,
        },
      },
    ] as Cardano.Utxo;
  });

  it('returns undefined when utxos array is empty', () => {
    const result = getEligibleCollateralUtxo([]);
    expect(result).toBeUndefined();
  });

  it('returns the UTXO when it has pure ADA and meets minimum amount', () => {
    const result = getEligibleCollateralUtxo([pureAdaUtxo]);
    expect(result).toBeDefined();
    expect(result).toEqual(pureAdaUtxo);
  });

  it('returns undefined when UTXO has more than minimum amount', () => {
    const result = getEligibleCollateralUtxo([largeUtxo]);
    expect(result).toBeUndefined(); // largeUtxo has 10 ADA, but exact match required (5 ADA)
  });

  it('returns undefined when UTXO has native tokens', () => {
    const result = getEligibleCollateralUtxo([utxoWithAssets]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when UTXO has insufficient ADA', () => {
    const result = getEligibleCollateralUtxo([smallUtxo]);
    expect(result).toBeUndefined();
  });

  it('returns the first eligible UTXO when at least one UTXO is eligible among mixed UTXOs', () => {
    const result = getEligibleCollateralUtxo([
      smallUtxo,
      utxoWithAssets,
      pureAdaUtxo,
    ]);
    expect(result).toBeDefined();
    expect(result).toEqual(pureAdaUtxo);
  });

  it('returns undefined when all UTXOs are ineligible', () => {
    const result = getEligibleCollateralUtxo([smallUtxo, utxoWithAssets]);
    expect(result).toBeUndefined();
  });

  it('returns the first eligible UTXO when multiple eligible UTXOs exist', () => {
    const result = getEligibleCollateralUtxo([pureAdaUtxo, largeUtxo]);
    expect(result).toBeDefined();
    expect(result).toEqual(pureAdaUtxo); // Should return the first one that exactly matches (5 ADA)
  });

  it('uses custom minimum collateral amount when provided', () => {
    const customMin = BigInt(10_000_000); // 10 ADA
    const result = getEligibleCollateralUtxo([pureAdaUtxo], customMin);
    expect(result).toBeUndefined(); // pureAdaUtxo has 5 ADA, not exactly 10 ADA
  });

  it('returns undefined when UTXO does not exactly match custom minimum amount', () => {
    const customMin = BigInt(3_000_000); // 3 ADA
    const result = getEligibleCollateralUtxo([pureAdaUtxo], customMin);
    expect(result).toBeUndefined(); // pureAdaUtxo has 5 ADA, but exact match required (3 ADA)
  });

  it('returns UTXO when it exactly matches custom minimum amount', () => {
    const customMin = BigInt(COLLATERAL_AMOUNT_LOVELACES); // 5 ADA
    const result = getEligibleCollateralUtxo([pureAdaUtxo], customMin);
    expect(result).toBeDefined();
    expect(result).toEqual(pureAdaUtxo); // pureAdaUtxo has exactly 5 ADA
  });

  it('uses default minimum collateral amount when not provided', () => {
    const result = getEligibleCollateralUtxo([pureAdaUtxo]);
    expect(result).toBeDefined();
    expect(result).toEqual(pureAdaUtxo);
  });

  it('handles UTXO with empty assets map', () => {
    const utxoWithEmptyAssets: Cardano.Utxo = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '7f7f9abafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b52',
        ),
        index: 4,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(COLLATERAL_AMOUNT_LOVELACES),
          assets: new Map(),
        },
      },
    ] as Cardano.Utxo;

    const result = getEligibleCollateralUtxo([utxoWithEmptyAssets]);
    expect(result).toBeDefined();
    expect(result).toEqual(utxoWithEmptyAssets);
  });

  it('returns undefined when UTXO has exactly minimum amount but with assets', () => {
    const utxoWithMinAmountAndAssets: Cardano.Utxo = [
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        txId: Cardano.TransactionId(
          '8f8f9abafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b53',
        ),
        index: 5,
      },
      {
        address: Cardano.PaymentAddress(
          'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
        ),
        value: {
          coins: BigInt(COLLATERAL_AMOUNT_LOVELACES),
          assets: new Map([
            [
              Cardano.AssetId(
                'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
              ),
              BigInt(50),
            ],
          ]),
        },
      },
    ] as Cardano.Utxo;

    const result = getEligibleCollateralUtxo([utxoWithMinAmountAndAssets]);
    expect(result).toBeUndefined();
  });
});
