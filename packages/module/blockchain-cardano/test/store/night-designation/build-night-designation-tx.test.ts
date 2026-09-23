import { Cardano, Serialization } from '@cardano-sdk/core';
import { mockProviders } from '@cardano-sdk/util-dev';
import {
  InsufficientCollateralError,
  createInputResolver,
} from '@lace-contract/cardano-context';
import {
  CardanoDustNetwork,
  CardanoPaymentKeyHash,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  dustMappingDatumToCbor,
  getCnightAssetId,
  getDustGeneratorPaymentAddress,
  getDustGeneratorScriptHash,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { describe, expect, it } from 'vitest';

import { boundedExUnitsEvaluator } from '../../../src/store/night-designation/bounded-ex-units-evaluator';
import { buildNightDesignationTx } from '../../../src/store/night-designation/build-night-designation-tx';

import type { NightDesignationTxBuilderDependencies } from '../../../src/store/night-designation/build-night-designation-tx';

const { ledgerTip, protocolParameters, utxo } = mockProviders;

const ownAddress = utxo[0][1].address;
const network = CardanoDustNetwork.testnet;
const cnightAssetId = getCnightAssetId(network);
const nftAssetId = getDustMappingNftAssetId(network);
const scriptAddress = getDustGeneratorPaymentAddress(network);

const stakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));
const paymentKeyHash = CardanoPaymentKeyHash(new Uint8Array(28).fill(0xcd));
// Canonical SCALE-compact: the 0x6f header selects big-integer mode declaring
// 31 scalar bytes and the top byte is non-zero, so this 32-byte payload is
// minimal and in-field.
const dustPubkey = MidnightCoinPubkey(
  new Uint8Array([0x6f, ...Array.from({ length: 30 }, () => 0xef), 0x11]),
);
const ttlSlot = Cardano.Slot(Number(ledgerTip.slot) + 7200);

// Plutus V3 needs cost models + realistic ex-unit limits, which the
// canonical fixture PP omits.
const plutusProtocolParameters = {
  ...protocolParameters,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  maxExecutionUnitsPerTransaction: {
    memory: 14_000_000,
    steps: 10_000_000_000,
  },
  costModels: new Map([
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 251 }, () => 0)],
  ]),
} as unknown as typeof protocolParameters;

// Three cNIGHT UTxOs — exercises the rotation invariant (all must be
// inputs) and conservation (cNIGHT returns to the user, never burned).
// txIds are chosen so the registration UTxO (below) does NOT canonically
// sort to index 0, proving redeemer re-indexing.
const cnightUtxos: Cardano.Utxo[] = [
  ['11'.repeat(32), 0, 50n],
  ['33'.repeat(32), 0, 30n],
  ['ee'.repeat(32), 0, 20n],
].map(
  ([txId, index, qty]) =>
    [
      {
        txId: txId as Cardano.TransactionId,
        index: index as number,
        address: ownAddress,
      },
      {
        address: ownAddress,
        value: {
          coins: 3_000_000n,
          assets: new Map([[cnightAssetId, qty as bigint]]),
        },
      },
    ] as Cardano.Utxo,
);
const totalCnight = 100n;

// Registration UTxO at the script address (update / deregister) — carries
// the mapping NFT + an inline DustMappingDatum bound to the stake key.
const registrationUtxo: Cardano.Utxo = [
  {
    txId: '99'.repeat(32) as Cardano.TransactionId,
    index: 0,
    address: scriptAddress,
  },
  {
    address: scriptAddress,
    value: { coins: 3_000_000n, assets: new Map([[nftAssetId, 1n]]) },
    datum: Serialization.PlutusData.fromCbor(
      dustMappingDatumToCbor({
        cWallet: { kind: 'verificationKey', stakeKeyHash },
        dustAddress: dustPubkey,
      }),
    ).toCore(),
  },
];

const makeDeps = (
  extraResolvable: Cardano.Utxo[] = [],
): NightDesignationTxBuilderDependencies => ({
  networkMagic: Cardano.NetworkMagics.Preprod,
  // ADA cover + collateral pool (cNIGHT UTxOs are forced separately).
  coverUtxos: utxo,
  txEvaluator: boundedExUnitsEvaluator,
  inputResolver: createInputResolver([
    ...cnightUtxos,
    ...utxo,
    ...extraResolvable,
  ]),
});

const sumAsset = (
  entries: { value: Cardano.Value }[],
  assetId: Cardano.AssetId,
): bigint =>
  entries.reduce(
    (total, { value }) => total + (value.assets?.get(assetId) ?? 0n),
    0n,
  );

const parse = (cbor: Serialization.TxCBOR) =>
  Serialization.Transaction.fromCbor(cbor).toCore();

const assertExUnitsUnderLimit = (tx: Cardano.Tx) => {
  const totalMem = (tx.witness.redeemers ?? []).reduce(
    (t, r) => t + r.executionUnits.memory,
    0,
  );
  const totalSteps = (tx.witness.redeemers ?? []).reduce(
    (t, r) => t + r.executionUnits.steps,
    0,
  );
  expect(totalMem).toBeLessThanOrEqual(
    plutusProtocolParameters.maxExecutionUnitsPerTransaction.memory,
  );
  expect(totalSteps).toBeLessThanOrEqual(
    plutusProtocolParameters.maxExecutionUnitsPerTransaction.steps,
  );
};

// The script-data-hash must be present and computed over ONLY the V3 cost
// model — a stray V1/V2 language view would make the node's recomputed hash
// diverge and fail Phase-1. We assert presence + that the witness carries only
// V3 scripts; the register case additionally pins the exact hash (it's
// deterministic — single mint redeemer at a fixed budget, no spend index) as a
// tripwire for any tx-construction change on a future SDK bump.
const assertScriptDataHash = (tx: Cardano.Tx) => {
  expect(tx.body.scriptIntegrityHash).toBeDefined();
  const scripts = tx.witness.scripts ?? [];
  const plutusScripts = scripts.filter(
    (script): script is Cardano.PlutusScript =>
      script.__type === Cardano.ScriptType.Plutus,
  );
  // Exactly one script, Plutus V3, no native scripts.
  expect(plutusScripts).toHaveLength(scripts.length);
  expect(plutusScripts.map(script => script.version)).toEqual([
    Cardano.PlutusLanguageVersion.V3,
  ]);
  // The attached witness must hash to the real dust-generator script (= mint
  // policy id + script address). Double-CBOR-wrapped script bytes witness the
  // WRONG hash and the ledger rejects the tx at submit (Missing/Extraneous
  // script witnesses); the builder-local scriptIntegrityHash alone does not
  // catch it.
  expect(Serialization.Script.fromCore(plutusScripts[0]).hash()).toBe(
    getDustGeneratorScriptHash(network),
  );
};

describe('buildNightDesignationTx', () => {
  it('register: mints the NFT, rotates all cNIGHT, conserves cNIGHT, valid script-data-hash', async () => {
    const result = await buildNightDesignationTx(
      {
        network,
        action: { kind: 'register', dustPubkey },
        cnightUtxos,
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: ownAddress,
        ttlSlot,
        protocolParameters: plutusProtocolParameters,
      },
      makeDeps(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tx = parse(result.value.cbor);

    // Mint +1 of the mapping NFT.
    expect(tx.body.mint?.get(nftAssetId)).toBe(1n);

    // Both required signers (payment + stake — the validator checks the stake sig).
    expect(tx.body.requiredExtraSignatures).toHaveLength(2);

    // Plutus essentials.
    expect(tx.body.collaterals?.length).toBeGreaterThan(0);
    expect(tx.witness.scripts?.length).toBeGreaterThan(0);
    expect(tx.witness.signatures.size).toBe(0); // unsigned
    assertScriptDataHash(tx);
    assertExUnitsUnderLimit(tx);
    // Pinned tripwire: the register script-data-hash is fully deterministic
    // (one mint redeemer at a fixed budget, no input-dependent index). It is
    // hashed over the Conway MAP redeemer encoding (computeConwayScriptDataHash);
    // a shift here means the redeemer or language-view encoding changed.
    expect(tx.body.scriptIntegrityHash).toMatchInlineSnapshot(
      `"4b227858c3af67bab1b834cdd55cec969e97205462568950cd0df4bbd539d37a"`,
    );

    // Rotation: every cNIGHT UTxO is an input.
    const inputReferences = new Set(
      tx.body.inputs.map(input => `${input.txId}#${input.index}`),
    );
    for (const [ref] of cnightUtxos) {
      expect(inputReferences.has(`${ref.txId}#${ref.index}`)).toBe(true);
    }

    // Conservation: all cNIGHT flows back to the user's outputs (none burned).
    expect(sumAsset(tx.body.outputs, cnightAssetId)).toBe(totalCnight);
    // The NFT must NOT leak into change — it sits on the script output only.
    const changeOutputs = tx.body.outputs.filter(
      out => out.address === ownAddress,
    );
    expect(sumAsset(changeOutputs, nftAssetId)).toBe(0n);
    expect(sumAsset(changeOutputs, cnightAssetId)).toBe(totalCnight);
    expect(result.value.fee).toBeGreaterThan(0n);
  });

  it('deregister: burns the NFT, spends the registration UTxO with a non-zero redeemer index', async () => {
    const result = await buildNightDesignationTx(
      {
        network,
        action: { kind: 'deregister', registrationUtxo },
        cnightUtxos,
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: ownAddress,
        ttlSlot,
        protocolParameters: plutusProtocolParameters,
      },
      makeDeps([registrationUtxo]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tx = parse(result.value.cbor);

    // Burn -1.
    expect(tx.body.mint?.get(nftAssetId)).toBe(-1n);

    // mint + spend redeemers.
    const purposes = (tx.witness.redeemers ?? []).map(r => r.purpose);
    expect(purposes).toContain(Cardano.RedeemerPurpose.mint);
    expect(purposes).toContain(Cardano.RedeemerPurpose.spend);

    // The spend redeemer's index points at the registration UTxO's position
    // in the canonically-sorted input set — and that position is NOT 0
    // (txId '99…' sorts after '11…' / '33…'), proving re-indexing.
    const sortedInputs = [...tx.body.inputs].sort((a, b) =>
      a.txId === b.txId ? a.index - b.index : a.txId < b.txId ? -1 : 1,
    );
    const registrationIndex = sortedInputs.findIndex(
      input =>
        input.txId === registrationUtxo[0].txId &&
        input.index === registrationUtxo[0].index,
    );
    expect(registrationIndex).toBeGreaterThan(0);
    const spendRedeemer = (tx.witness.redeemers ?? []).find(
      r => r.purpose === Cardano.RedeemerPurpose.spend,
    );
    expect(spendRedeemer?.index).toBe(registrationIndex);

    assertScriptDataHash(tx);
    assertExUnitsUnderLimit(tx);
  });

  it('update: withdraws from the script reward account (single withdrawal, no mint)', async () => {
    const result = await buildNightDesignationTx(
      {
        network,
        action: {
          kind: 'update',
          dustPubkey,
          registrationUtxo,
          scriptWithdrawableLovelace: 0n,
        },
        cnightUtxos,
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: ownAddress,
        ttlSlot,
        protocolParameters: plutusProtocolParameters,
      },
      makeDeps([registrationUtxo]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tx = parse(result.value.cbor);

    // No mint on update.
    expect(tx.body.mint).toBeUndefined();

    // Exactly one withdrawal — the script reward account.
    expect(tx.body.withdrawals).toHaveLength(1);

    const purposes = (tx.witness.redeemers ?? []).map(r => r.purpose);
    expect(purposes).toContain(Cardano.RedeemerPurpose.spend);
    expect(purposes).toContain(Cardano.RedeemerPurpose.withdrawal);

    assertScriptDataHash(tx);
    assertExUnitsUnderLimit(tx);
  });

  it('register: errors with no-cnight when the account holds no cNIGHT', async () => {
    const result = await buildNightDesignationTx(
      {
        network,
        action: { kind: 'register', dustPubkey },
        cnightUtxos: [],
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: ownAddress,
        ttlSlot,
        protocolParameters: plutusProtocolParameters,
      },
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('no-cnight');
  });

  it('propagates the raw InsufficientCollateralError (→ generic build failure) rather than mislabeling it no-cardano-utxos', async () => {
    // A non-empty cover pool whose only UTxO can't satisfy collateral (below
    // the ~2.6 ADA coverage target for these params) is NOT the empty-pool
    // "not enough ADA" case (that's caught upstream). The builder error must
    // surface as-is — carrying no `no-cardano-utxos` code — so the side-effect
    // maps it to generic copy.
    const smallAda: Cardano.Utxo = [
      {
        txId: '88'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: ownAddress,
      },
      { address: ownAddress, value: { coins: 1_500_000n } },
    ];
    await expect(
      buildNightDesignationTx(
        {
          network,
          action: { kind: 'register', dustPubkey },
          cnightUtxos,
          paymentKeyHash,
          stakeKeyHash,
          changeAddress: ownAddress,
          ttlSlot,
          protocolParameters: plutusProtocolParameters,
        },
        {
          networkMagic: Cardano.NetworkMagics.Preprod,
          coverUtxos: [smallAda],
          txEvaluator: boundedExUnitsEvaluator,
          inputResolver: createInputResolver([...cnightUtxos, smallAda]),
        },
      ),
    ).rejects.toThrow(InsufficientCollateralError);
  });

  it('rejects when an input cannot be resolved instead of evaluating ex-units on a partial UTXO set', async () => {
    // inputResolver deliberately omits the cNIGHT UTxOs. The builder must throw
    // rather than silently drop them — a partial set would yield wrong redeemer
    // budgets / a script-data-hash the ledger rejects on submit.
    await expect(
      buildNightDesignationTx(
        {
          network,
          action: { kind: 'register', dustPubkey },
          cnightUtxos,
          paymentKeyHash,
          stakeKeyHash,
          changeAddress: ownAddress,
          ttlSlot,
          protocolParameters: plutusProtocolParameters,
        },
        {
          networkMagic: Cardano.NetworkMagics.Preprod,
          coverUtxos: utxo,
          txEvaluator: boundedExUnitsEvaluator,
          // Missing cnightUtxos — every cNIGHT input is unresolvable.
          inputResolver: createInputResolver([...utxo]),
        },
      ),
    ).rejects.toThrow(/Cannot resolve transaction input/);
  });

  it('rejects when the evaluator returns no budget for a redeemer instead of shipping seed max units', async () => {
    // An evaluator that returns nothing — the builder must fail fast rather
    // than keep the seeded per-tx maximum ex-units on the unevaluated redeemer.
    const emptyEvaluator = {
      evaluate: async () => [],
    } as unknown as NightDesignationTxBuilderDependencies['txEvaluator'];
    await expect(
      buildNightDesignationTx(
        {
          network,
          action: { kind: 'register', dustPubkey },
          cnightUtxos,
          paymentKeyHash,
          stakeKeyHash,
          changeAddress: ownAddress,
          ttlSlot,
          protocolParameters: plutusProtocolParameters,
        },
        {
          networkMagic: Cardano.NetworkMagics.Preprod,
          coverUtxos: utxo,
          txEvaluator: emptyEvaluator,
          inputResolver: createInputResolver([...cnightUtxos, ...utxo]),
        },
      ),
    ).rejects.toThrow(/No ex-units evaluation/);
  });

  // KNOWN DEFECT, pinned: collateral is reserved as a WHOLE UTxO and then
  // removed from the funding pool, so an account whose only non-cNIGHT UTxO
  // backs collateral has nothing left to fund the tx — it fails topping up the
  // change min-ADA and surfaces as "not enough ADA" on an account with plenty.
  // When that exclusion is removed this test FAILS: swap the rejection for
  // `expect(result.ok).toBe(true)` rather than deleting the case.
  it('known defect: a lone cover UTxO reserved as collateral leaves nothing to fund the build', async () => {
    // 12 distinct policies, because change min-ADA scales with policy count
    // (2,835,980 here) — 12 names under a single policy would be far too cheap
    // to reproduce the shortfall. The coin figure is 4 ADA rather than the
    // reported wallet's 5.707587 because `boundedExUnitsEvaluator` prices a
    // ~0.47 ADA fee where production seeded ~1.7 ADA; 4 ADA puts the change one
    // step below its min-ADA, which is the same shortfall the account hit.
    const tightCnightUtxo: Cardano.Utxo = [
      {
        txId: 'a1'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: ownAddress,
      },
      {
        address: ownAddress,
        value: {
          coins: 4_000_000n,
          assets: new Map<Cardano.AssetId, bigint>([
            [cnightAssetId, 100n],
            ...Array.from(
              { length: 11 },
              (_, index) =>
                [
                  Cardano.AssetId(
                    `${(0xa0 + index).toString(16).repeat(28)}746f6b`,
                  ),
                  1n,
                ] as const,
            ),
          ]),
        },
      },
    ];
    const consolidatedCover: Cardano.Utxo = [
      {
        txId: 'b2'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: ownAddress,
      },
      { address: ownAddress, value: { coins: 236_652_484n } },
    ];
    const secondCover: Cardano.Utxo = [
      {
        txId: 'c3'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: ownAddress,
      },
      { address: ownAddress, value: { coins: 5_289_566n } },
    ];

    const build = async (coverPool: Cardano.Utxo[]) =>
      buildNightDesignationTx(
        {
          network,
          action: { kind: 'register', dustPubkey },
          cnightUtxos: [tightCnightUtxo],
          paymentKeyHash,
          stakeKeyHash,
          changeAddress: ownAddress,
          ttlSlot,
          protocolParameters: plutusProtocolParameters,
        },
        {
          networkMagic: Cardano.NetworkMagics.Preprod,
          coverUtxos: coverPool,
          txEvaluator: boundedExUnitsEvaluator,
          inputResolver: createInputResolver([tightCnightUtxo, ...coverPool]),
        },
      );

    // 236 ADA of cover, and the build still cannot fund itself: collateral
    // reserves that single UTxO and it leaves the spendable pool.
    await expect(build([consolidatedCover])).rejects.toThrow(
      /UTxO pool exhausted/,
    );

    // Proof the balance was never the problem — adding a second, far smaller
    // cover UTxO (collateral still takes the larger one) makes the same build
    // succeed. Any fix must make the first case behave like this one.
    const result = await build([consolidatedCover, secondCover]);
    expect(result.ok).toBe(true);
  });
});
