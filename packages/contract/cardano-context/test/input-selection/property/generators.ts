import fc from 'fast-check';

import type {
  CoinSelectorParams,
  CoinSelectorProtocolParameters,
} from '../../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';
import type { Arbitrary } from 'fast-check';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g' as Cardano.PaymentAddress;
const changeAddress =
  'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk' as Cardano.PaymentAddress;

const policyId = '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882';
const assetId = (name: string): Cardano.AssetId =>
  `${policyId}${Buffer.from(name).toString('hex')}` as Cardano.AssetId;

/**
 * The fixed pool of synthetic asset ids every generated value draws from, so
 * asset requirements and UTxO holdings overlap often enough to be meaningful.
 */
const ASSET_IDS = Array.from({ length: 10 }, (_, index) =>
  assetId(`asset${index}`),
);

const MAX_UTXO_COINS = 10_000_000_000n;
const MAX_OUTPUT_COINS = 5_000_000_000n;
const MAX_UTXO_ASSET_QUANTITY = 1_000_000_000n;
const MAX_WITHDRAWAL_COINS = 2_000_000_000n;
const MIN_ADVERSARIAL_COINS = -10_000_000_000n;
const MAX_ADVERSARIAL_COINS = 200_000_000_000n;
const MAX_ADVERSARIAL_ASSET_QUANTITY = 5_000_000_000n;
const MAX_TIGHT_SURPLUS_DELTA = 8_000_000n;
const MAX_HIGH_MAGNITUDE_COINS = 2n ** 63n;
const MAX_SEED = 2n ** 64n - 1n;
const MAX_PRE_SELECTED = 3;

/**
 * Exceeds the largest possible standard pool (60 UTxOs of `MAX_UTXO_COINS`)
 * plus the largest disjoint pre-selected set, so targets at or above this
 * coin quantity are unsatisfiable by construction.
 */
const MIN_UNSATISFIABLE_COINS = 700_000_000_000n;
const MAX_UNSATISFIABLE_COINS = 1_000_000_000_000n;

/**
 * Caps the total coins of a high-magnitude pool below the u64 bound, with
 * headroom for the disjoint pre-selected UTxOs, so change coins always remain
 * serializable and an assertion-side CBOR failure cannot be a false positive.
 */
const MAX_HIGH_MAGNITUDE_POOL_COINS =
  2n ** 64n - 1n - BigInt(MAX_PRE_SELECTED) * MAX_UTXO_COINS - 1_000_000_000n;

const txIn = (txId: string, index: number): Cardano.TxIn => ({
  txId: txId as Cardano.TransactionId,
  index,
});

const utxo = (
  index: Cardano.TxIn,
  coins: bigint,
  assets?: Cardano.TokenMap,
): Cardano.Utxo => [
  { ...index, address },
  { address, value: { coins, assets } },
];

const positiveQuantity = (max: bigint): Arbitrary<bigint> =>
  fc.bigInt({ min: 1n, max });

const nonZeroQuantity = (max: bigint): Arbitrary<bigint> =>
  fc
    .tuple(fc.bigInt({ min: 1n, max }), fc.boolean())
    .map(([magnitude, negative]) => (negative ? -magnitude : magnitude));

const tokenMap = (quantity: Arbitrary<bigint>): Arbitrary<Cardano.TokenMap> =>
  fc
    .uniqueArray(fc.constantFrom(...ASSET_IDS), {
      minLength: 1,
      maxLength: ASSET_IDS.length,
    })
    .chain(ids =>
      fc.tuple(
        ...ids.map(id =>
          quantity.map(amount => [id, amount] as [Cardano.AssetId, bigint]),
        ),
      ),
    )
    .map(entries => new Map(entries));

/**
 * Per-UTxO coin quantities, with zero-coin UTxOs weighted in so pools holding
 * no lovelace at all occur often enough to exercise the forced-pick paths.
 */
const utxoCoins: Arbitrary<bigint> = fc.oneof(
  { arbitrary: fc.constant(0n), weight: 1 },
  { arbitrary: fc.bigInt({ min: 1n, max: MAX_UTXO_COINS }), weight: 5 },
);

const utxoPoolEntry = fc.record({
  coins: utxoCoins,
  assets: fc.option(tokenMap(positiveQuantity(MAX_UTXO_ASSET_QUANTITY)), {
    nil: undefined,
  }),
});

/**
 * A mixture of sparse pools (empty and all-zero-coin pools included) and
 * dense pools that plausibly hold what realistic targets require.
 */
const utxoPool: Arbitrary<Cardano.Utxo[]> = fc
  .oneof(
    { arbitrary: fc.array(utxoPoolEntry, { maxLength: 8 }), weight: 1 },
    {
      arbitrary: fc.array(utxoPoolEntry, {
        minLength: 8,
        maxLength: 60,
        size: 'max',
      }),
      weight: 2,
    },
  )
  .map(values =>
    values.map(({ coins, assets }, index) =>
      utxo(txIn('t', index), coins, assets),
    ),
  );

/**
 * Adds a signed quantity delta to a token map, dropping entries that cancel
 * out. Positive deltas model burns (extra required quantity) and negative
 * deltas model mints (implicit inputs surfacing in change).
 */
const mergeAssets = (
  base: Cardano.TokenMap | undefined,
  delta: Cardano.TokenMap | undefined,
): Cardano.TokenMap | undefined => {
  const merged = new Map(base ?? []);
  for (const [id, quantity] of delta ?? []) {
    const total = (merged.get(id) ?? 0n) + quantity;
    if (total === 0n) {
      merged.delete(id);
    } else {
      merged.set(id, total);
    }
  }
  return merged.size > 0 ? merged : undefined;
};

type TargetAndOutputs = Pick<
  CoinSelectorParams,
  'outputsToCover' | 'targetValue'
>;

/**
 * Payment-shaped targets: the target is the sum of generated user outputs
 * (also emitted as `outputsToCover`), optionally perturbed by a deposit-style
 * coin increase, a withdrawal-style decrease and a mint/burn asset delta.
 * The withdrawal can exceed the output coins, yielding negative target coins
 * that act as implicit inputs increasing the change.
 */
const realisticTarget: Arbitrary<TargetAndOutputs> = fc
  .record({
    outputs: fc.array(
      fc.record({
        coins: fc.oneof(
          { arbitrary: fc.constant(0n), weight: 1 },
          {
            arbitrary: fc.bigInt({ min: 0n, max: MAX_OUTPUT_COINS }),
            weight: 4,
          },
        ),
        assets: fc.option(tokenMap(positiveQuantity(MAX_UTXO_ASSET_QUANTITY)), {
          nil: undefined,
        }),
      }),
      { maxLength: 4 },
    ),
    deposit: fc.constantFrom(0n, 2_000_000n, 500_000_000n),
    withdrawal: fc.bigInt({ min: 0n, max: MAX_WITHDRAWAL_COINS }),
    mintAndBurnDelta: fc.option(
      tokenMap(nonZeroQuantity(MAX_UTXO_ASSET_QUANTITY)),
      { nil: undefined },
    ),
  })
  .map(({ outputs, deposit, withdrawal, mintAndBurnDelta }) => {
    const outputsToCover: Cardano.TxOut[] = outputs.map(
      ({ coins, assets }) => ({ address, value: { coins, assets } }),
    );
    const outputCoins = outputs.reduce((total, { coins }) => total + coins, 0n);
    const assets = mergeAssets(
      outputs.reduce<Cardano.TokenMap | undefined>(
        (total, output) => mergeAssets(total, output.assets),
        undefined,
      ),
      mintAndBurnDelta,
    );
    return {
      outputsToCover,
      targetValue: { coins: outputCoins + deposit - withdrawal, assets },
    };
  });

/**
 * Arbitrary targets unrelated to any output shape, including negative coins
 * and asset quantities a sparse pool often cannot cover, to exercise implicit
 * inputs and the failure paths.
 */
const adversarialTarget: Arbitrary<TargetAndOutputs> = fc
  .record({
    coins: fc.bigInt({
      min: MIN_ADVERSARIAL_COINS,
      max: MAX_ADVERSARIAL_COINS,
    }),
    assets: fc.option(
      tokenMap(nonZeroQuantity(MAX_ADVERSARIAL_ASSET_QUANTITY)),
      { nil: undefined },
    ),
  })
  .map(targetValue => ({ outputsToCover: undefined, targetValue }));

/**
 * Targets whose coin requirement provably exceeds any generated pool,
 * guaranteeing the `BalanceInsufficient` oracle keeps running often.
 */
const unsatisfiableTarget: Arbitrary<TargetAndOutputs> = fc
  .record({
    coins: fc.bigInt({
      min: MIN_UNSATISFIABLE_COINS,
      max: MAX_UNSATISFIABLE_COINS,
    }),
    assets: fc.option(
      tokenMap(nonZeroQuantity(MAX_ADVERSARIAL_ASSET_QUANTITY)),
      { nil: undefined },
    ),
  })
  .map(targetValue => ({ outputsToCover: undefined, targetValue }));

const protocolParameters = fc.record({
  coinsPerUtxoByte: fc.constantFrom(0, 4310, 50_000),
  maxValueSize: fc.constantFrom(0, 60, 5000),
});

/** A UTxO pool paired with the target and protocol parameters to select for. */
type Scenario = {
  availableUtxo: Cardano.Utxo[];
  targetAndOutputs: TargetAndOutputs;
  protocolParameters: CoinSelectorProtocolParameters;
};

const standardScenario: Arbitrary<Scenario> = utxoPool.chain(availableUtxo =>
  fc
    .record({
      targetAndOutputs: fc.oneof(
        { arbitrary: realisticTarget, weight: 6 },
        { arbitrary: adversarialTarget, weight: 2 },
        { arbitrary: unsatisfiableTarget, weight: 1 },
      ),
      protocolParameters,
    })
    .map(rest => ({ availableUtxo, ...rest })),
);

/**
 * Targets covered by the pool with only a tiny coin surplus (within a few
 * multiples of a realistic min-ADA), so change construction must top up the
 * selection from the remaining pool and often exhausts it. Asset requirements
 * are drawn from what the pool actually holds and `coinsPerUtxoByte` is kept
 * positive, so any failure is specifically change construction.
 */
const tightSurplusScenario: Arbitrary<Scenario> = utxoPool.chain(
  availableUtxo => {
    const poolCoins = availableUtxo.reduce(
      (total, [, output]) => total + output.value.coins,
      0n,
    );
    const heldAssets = new Map<Cardano.AssetId, bigint>();
    for (const [, output] of availableUtxo) {
      for (const [id, quantity] of output.value.assets ?? []) {
        heldAssets.set(id, (heldAssets.get(id) ?? 0n) + quantity);
      }
    }
    const heldEntries = [...heldAssets.entries()];
    const requiredAssets: Arbitrary<Cardano.TokenMap | undefined> =
      heldEntries.length === 0
        ? fc.constant(undefined)
        : fc.option(
            fc
              .uniqueArray(fc.constantFrom(...heldEntries), {
                minLength: 1,
                maxLength: heldEntries.length,
              })
              .chain(entries =>
                fc.tuple(
                  ...entries.map(([id, held]) =>
                    fc
                      .bigInt({ min: 1n, max: held })
                      .map(
                        quantity => [id, quantity] as [Cardano.AssetId, bigint],
                      ),
                  ),
                ),
              )
              .map(entries => new Map(entries)),
            { nil: undefined },
          );
    return fc
      .record({
        delta: fc.bigInt({ min: 0n, max: MAX_TIGHT_SURPLUS_DELTA }),
        assets: requiredAssets,
        coinsPerUtxoByte: fc.oneof(
          { arbitrary: fc.constant(4310), weight: 2 },
          { arbitrary: fc.constant(50_000), weight: 1 },
        ),
        maxValueSize: fc.constantFrom(0, 60, 5000),
      })
      .map(({ delta, assets, coinsPerUtxoByte, maxValueSize }) => ({
        availableUtxo,
        targetAndOutputs: {
          outputsToCover: undefined,
          targetValue: { coins: poolCoins - delta, assets },
        },
        protocolParameters: { coinsPerUtxoByte, maxValueSize },
      }));
  },
);

/**
 * Pools and targets with coins near the CBOR u64 bound, exercising size
 * estimation and serialization at extreme magnitudes. The pool sum stays
 * below {@link MAX_HIGH_MAGNITUDE_POOL_COINS} so resulting change always
 * fits a u64.
 */
const highMagnitudeScenario: Arbitrary<Scenario> = fc
  .record({
    entries: fc.array(
      fc.record({
        coins: fc.bigInt({ min: 0n, max: MAX_HIGH_MAGNITUDE_COINS }),
        assets: fc.option(tokenMap(positiveQuantity(MAX_UTXO_ASSET_QUANTITY)), {
          nil: undefined,
        }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
    targetCoins: fc.bigInt({ min: 0n, max: MAX_HIGH_MAGNITUDE_COINS }),
    protocolParameters,
  })
  .filter(
    ({ entries }) =>
      entries.reduce((total, { coins }) => total + coins, 0n) <=
      MAX_HIGH_MAGNITUDE_POOL_COINS,
  )
  .map(({ entries, targetCoins, protocolParameters: parameters }) => ({
    availableUtxo: entries.map(({ coins, assets }, index) =>
      utxo(txIn('t', index), coins, assets),
    ),
    targetAndOutputs: {
      outputsToCover: undefined,
      targetValue: { coins: targetCoins },
    },
    protocolParameters: parameters,
  }));

const scenario: Arbitrary<Scenario> = fc.oneof(
  { arbitrary: standardScenario, weight: 15 },
  { arbitrary: tightSurplusScenario, weight: 4 },
  { arbitrary: highMagnitudeScenario, weight: 1 },
);

const cloneUtxo = ([input, output]: Cardano.Utxo): Cardano.Utxo => [
  { ...input },
  {
    address: output.address,
    value: {
      coins: output.value.coins,
      ...(output.value.assets ? { assets: new Map(output.value.assets) } : {}),
    },
  },
];

const disjointPreSelectedUtxo: Arbitrary<Cardano.Utxo[]> = fc
  .array(
    fc.record({
      coins: utxoCoins,
      assets: fc.option(tokenMap(positiveQuantity(MAX_UTXO_ASSET_QUANTITY)), {
        nil: undefined,
      }),
    }),
    { maxLength: MAX_PRE_SELECTED },
  )
  .map(values =>
    values.map(({ coins, assets }, index) =>
      utxo(txIn('p', index), coins, assets),
    ),
  );

/**
 * Pre-selected UTxOs in three flavors: a referential subset of the pool, a
 * disjoint set absent from the pool entirely, and key-collision clones that
 * share a pool entry's `txId:index` through a different object instance, so
 * key-based deduplication in the selectors is exercised.
 */
const preSelectedUtxoArbitrary = (
  availableUtxo: Cardano.Utxo[],
): Arbitrary<Cardano.Utxo[] | undefined> =>
  fc.oneof(
    { arbitrary: fc.constant(undefined), weight: 6 },
    {
      arbitrary: fc.subarray(availableUtxo, {
        maxLength: Math.min(MAX_PRE_SELECTED, availableUtxo.length),
      }),
      weight: 1,
    },
    { arbitrary: disjointPreSelectedUtxo, weight: 1 },
    {
      arbitrary: fc
        .subarray(availableUtxo, {
          maxLength: Math.min(MAX_PRE_SELECTED, availableUtxo.length),
        })
        .map(entries => entries.map(cloneUtxo)),
      weight: 1,
    },
  );

/** A generated selector invocation plus the RNG seed to build it with. */
export type CoinSelectorPropertyInput = {
  params: CoinSelectorParams;
  seed: bigint;
};

/**
 * Inputs that once tripped the justified-failure oracle: their change coins
 * sit within a few lovelace of the min-ADA fundability boundary, where the
 * order-sensitive recursive halving of the change assets makes some selectors
 * fail while a differently ordered grouping succeeds. Pinned as fc.assert
 * examples so every run re-checks the boundary.
 */
export const regressionExamples: CoinSelectorPropertyInput[] = [
  {
    params: {
      availableUtxo: [
        utxo(
          txIn('t', 0),
          1_917_836_584n,
          new Map([
            [assetId('asset2'), 574_856_247n],
            [assetId('asset4'), 10n],
            [assetId('asset9'), 7n],
          ]),
        ),
        utxo(txIn('t', 1), 7_711_096_250n),
      ],
      changeAddress,
      protocolParameters: { coinsPerUtxoByte: 4310, maxValueSize: 60 },
      targetValue: {
        assets: new Map([
          [assetId('asset4'), 2n],
          [assetId('asset9'), 1n],
        ]),
        coins: 9_626_060_563n,
      },
    },
    seed: 0n,
  },
  {
    params: {
      availableUtxo: [
        utxo(
          txIn('t', 0),
          3_531_823_841n,
          new Map([
            [assetId('asset0'), 656_598_401n],
            [assetId('asset9'), 378_769_509n],
            [assetId('asset4'), 6n],
            [assetId('asset5'), 762_842_595n],
            [assetId('asset7'), 954_879_193n],
            [assetId('asset6'), 2n],
          ]),
        ),
      ],
      changeAddress,
      protocolParameters: { coinsPerUtxoByte: 4310, maxValueSize: 60 },
      targetValue: {
        assets: new Map([
          [assetId('asset9'), 378_769_486n],
          [assetId('asset0'), 1n],
        ]),
        coins: 3_526_005_341n,
      },
    },
    seed: 0n,
  },
];

/**
 * Generates complete {@link CoinSelectorParams} plus a selector seed. The
 * scenario is standard (a 0..60 entry pool with a realistic, adversarial or
 * provably unsatisfiable target), tight-surplus (pool covers the target with
 * only a few ADA to spare) or high-magnitude (coins near the u64 bound), each
 * with protocol parameter extremes and an occasional pre-selected set.
 */
export const coinSelectorPropertyInput: Arbitrary<CoinSelectorPropertyInput> =
  scenario.chain(({ availableUtxo, targetAndOutputs, ...rest }) =>
    fc
      .record({
        preSelectedUtxo: preSelectedUtxoArbitrary(availableUtxo),
        seed: fc.bigInt({ min: 0n, max: MAX_SEED }),
      })
      .map(({ preSelectedUtxo, seed }) => ({
        params: {
          availableUtxo,
          ...(preSelectedUtxo ? { preSelectedUtxo } : {}),
          targetValue: targetAndOutputs.targetValue,
          ...(targetAndOutputs.outputsToCover
            ? { outputsToCover: targetAndOutputs.outputsToCover }
            : {}),
          changeAddress,
          protocolParameters: rest.protocolParameters,
        },
        seed,
      })),
  );
