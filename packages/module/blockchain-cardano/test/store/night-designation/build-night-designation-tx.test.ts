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
const dustPubkey = MidnightCoinPubkey(new Uint8Array(32).fill(0xef));
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
  const versions = new Set(
    (tx.witness.scripts ?? []).map(script =>
      script.__type === Cardano.ScriptType.Plutus ? script.version : 'native',
    ),
  );
  expect([...versions]).toEqual([Cardano.PlutusLanguageVersion.V3]);
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
    // (one mint redeemer at a fixed budget, no inputs-dependent index). A
    // change here means tx-construction altered redeemer/language-view
    // encoding — e.g. on a future @cardano-sdk bump.
    expect(tx.body.scriptIntegrityHash).toMatchInlineSnapshot(
      `"9d9572f55da73137e54e2235d0e61f11da69d9b38fa0a5cb403d0452cbadf65e"`,
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
    // A non-empty cover pool whose only UTxO can't satisfy collateral (return
    // min-ADA / combined amount) is NOT the empty-pool "not enough ADA" case
    // (that's caught upstream). The builder error must surface as-is — carrying
    // no `no-cardano-utxos` code — so the side-effect maps it to generic copy.
    const smallAda: Cardano.Utxo = [
      {
        txId: '88'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: ownAddress,
      },
      { address: ownAddress, value: { coins: 4_000_000n } },
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
});
