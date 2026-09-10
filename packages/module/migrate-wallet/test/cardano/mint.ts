import { Cardano, Serialization } from '@cardano-sdk/core';

import { getUtxos } from './queries';
import { signTx } from './signing';
import { submitAndConfirm } from './tx';

import type { DerivedAccount } from './account';
import type { Providers } from './queries';

/**
 * Always-succeeds native minting policy: an empty `all of` is trivially
 * satisfied, so anyone may mint under it with no signature, redeemer, collateral,
 * or cost models. Test-harness token staging only. Its script hash is the policy
 * id.
 */
const ALWAYS_MINT_SCRIPT: Cardano.NativeScript = {
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireAllOf,
  scripts: [],
};

export const TEST_TOKEN_POLICY_ID = Cardano.PolicyId(
  Serialization.Script.fromCore(ALWAYS_MINT_SCRIPT).hash(),
);

export const testAssetId = (name: string): Cardano.AssetId =>
  Cardano.AssetId.fromParts(
    TEST_TOKEN_POLICY_ID,
    Cardano.AssetName(Buffer.from(name, 'utf8').toString('hex')),
  );

/**
 * A second always-succeeds policy, structurally distinct from
 * `ALWAYS_MINT_SCRIPT` (a `RequireAllOf` wrapping a trivially-satisfied
 * `RequireAllOf`) so it hashes differently and therefore carries a different
 * policy id. Lets a test stage assets spanning two real policies at once.
 * Test-harness token staging only.
 */
const ALWAYS_MINT_SCRIPT_2: Cardano.NativeScript = {
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireAllOf,
  scripts: [
    {
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireAllOf,
      scripts: [],
    },
  ],
};

const TEST_TOKEN_POLICY_ID_2 = Cardano.PolicyId(
  Serialization.Script.fromCore(ALWAYS_MINT_SCRIPT_2).hash(),
);

/** The id `name` carries under the second test policy. */
export const testAssetId2 = (name: string): Cardano.AssetId =>
  Cardano.AssetId.fromParts(
    TEST_TOKEN_POLICY_ID_2,
    Cardano.AssetName(Buffer.from(name, 'utf8').toString('hex')),
  );

// Min-ADA that rides with a single-asset token to the recipient (needs well
// under 2 ADA on preprod).
const TOKEN_OUTPUT_LOVELACE = 2_000_000n;
// Generous flat fee, above the minFee of a one-input mint carrying a full
// under-maxValueSize asset batch (~90 assets, ~0.45 ADA). Overpaying is valid,
// so this avoids a min-fee computation for a throwaway staging tx.
const MINT_FEE = 1_000_000n;

const largestPureAda = (utxos: Cardano.Utxo[]): Cardano.Utxo | undefined =>
  utxos
    .filter(([, out]) => !out.value.assets || out.value.assets.size === 0)
    .sort(([, a], [, b]) => (b.value.coins > a.value.coins ? 1 : -1))[0];

/**
 * Mints `assets` under `scripts` into one output sent to `to`, with
 * `outputLovelace` riding along (must cover that output's min-ADA). Spends
 * `input` (or the minter's largest pure-ADA UTxO), change back to the minter,
 * signed by the minter. Returns the confirmed tx id and the change UTxO, so
 * callers can chain batches without re-reading the (indexer-lagged) minter UTxO
 * set between mints. `scripts` may name several policies: one native mint may
 * span multiple policies as long as every minted policy's script witnesses it.
 */
const mintAssetsTo = async (
  providers: Providers,
  {
    minter,
    to,
    assets,
    outputLovelace,
    input,
    scripts,
  }: {
    minter: DerivedAccount;
    to: Cardano.PaymentAddress;
    assets: Cardano.TokenMap;
    outputLovelace: bigint;
    input?: Cardano.Utxo;
    scripts: Cardano.NativeScript[];
  },
): Promise<{ txId: Cardano.TransactionId; change: Cardano.Utxo }> => {
  const funding =
    input ?? largestPureAda(await getUtxos(providers, minter.address));
  if (!funding) throw new Error('minter has no pure-ADA UTxO to fund the mint');

  const changeCoins = funding[1].value.coins - outputLovelace - MINT_FEE;
  if (changeCoins <= 0n)
    throw new Error('minter UTxO too small to fund the mint');

  const body: Cardano.TxBody = {
    inputs: [funding[0]],
    outputs: [
      { address: to, value: { coins: outputLovelace, assets } },
      { address: minter.address, value: { coins: changeCoins } },
    ],
    fee: MINT_FEE,
    mint: assets,
  };

  const coreTx: Cardano.Tx = {
    // Placeholder id: the tx id is derived from the body, not serialised, so the
    // signed tx recomputes it. submitAndConfirm reads it back via getId().
    id: Cardano.TransactionId('0'.repeat(64)),
    body,
    witness: { signatures: new Map(), scripts },
  };

  const tx = Serialization.Transaction.fromCore(coreTx);
  const signed = await signTx(minter, tx, [funding]);
  const txId = await submitAndConfirm(providers, signed, to);
  const change: Cardano.Utxo = [
    { txId, index: 1, address: minter.address },
    { address: minter.address, value: { coins: changeCoins } },
  ];
  return { txId, change };
};

/** Mints `quantity` of a single test token to `to`. */
export const mintTestTokenTo = async (
  providers: Providers,
  {
    minter,
    to,
    assetName,
    quantity,
  }: {
    minter: DerivedAccount;
    to: Cardano.PaymentAddress;
    assetName: string;
    quantity: bigint;
  },
): Promise<Cardano.TransactionId> =>
  (
    await mintAssetsTo(providers, {
      minter,
      to,
      assets: new Map([[testAssetId(assetName), quantity]]),
      outputLovelace: TOKEN_OUTPUT_LOVELACE,
      scripts: [ALWAYS_MINT_SCRIPT],
    })
  ).txId;

/**
 * Mints one unit each of many distinct test tokens into a single output at `to`,
 * spending `input` (chain each batch's returned change into the next so parallel
 * batches don't collide on a stale minter UTxO). The caller batches names so the
 * output value stays under maxValueSize, used to bloat a source until its sweep
 * exceeds maxTxSize.
 */
export const mintTestAssetBatch = async (
  providers: Providers,
  {
    minter,
    to,
    assetNames,
    outputLovelace,
    input,
  }: {
    minter: DerivedAccount;
    to: Cardano.PaymentAddress;
    assetNames: string[];
    outputLovelace: bigint;
    input?: Cardano.Utxo;
  },
): Promise<{ txId: Cardano.TransactionId; change: Cardano.Utxo }> =>
  mintAssetsTo(providers, {
    minter,
    to,
    assets: new Map(assetNames.map(name => [testAssetId(name), 1n])),
    outputLovelace,
    input,
    scripts: [ALWAYS_MINT_SCRIPT],
  });

/**
 * Mints one unit of each name in `assetNames` under BOTH test policies into a
 * single output at `to`, in one tx. Each name therefore lands twice, as two
 * assets differing only by policy id, so a consumer that keys assets by name
 * alone collapses the pair.
 */
export const mintMultiPolicyAssetBatch = async (
  providers: Providers,
  {
    minter,
    to,
    assetNames,
    outputLovelace,
    input,
  }: {
    minter: DerivedAccount;
    to: Cardano.PaymentAddress;
    assetNames: string[];
    outputLovelace: bigint;
    input?: Cardano.Utxo;
  },
): Promise<{ txId: Cardano.TransactionId; change: Cardano.Utxo }> =>
  mintAssetsTo(providers, {
    minter,
    to,
    assets: new Map(
      assetNames.flatMap((name): [Cardano.AssetId, bigint][] => [
        [testAssetId(name), 1n],
        [testAssetId2(name), 1n],
      ]),
    ),
    outputLovelace,
    input,
    scripts: [ALWAYS_MINT_SCRIPT, ALWAYS_MINT_SCRIPT_2],
  });
