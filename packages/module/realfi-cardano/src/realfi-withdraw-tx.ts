/**
 * Builds the **unsigned** batched timelock-withdraw (claim) transaction with
 * `@cardano-sdk` — no Blaze. Every matured unstake left its released USDr at a
 * native-script timelock: `all [ RequireSignature(owner), RequireTimeAfter(slot) ]`
 * (see the RealFi SDK's `buildTimelockNativeScript`). A single tx can spend all
 * of them at once: one validity interval (`invalidBefore = max(unlockSlot)`)
 * satisfies every `RequireTimeAfter`, and the owner's one signature satisfies
 * every `RequireSignature`.
 *
 * Runs in the provider (service worker). Resolves the timelock UTxO values,
 * protocol tip, and a change/fee floor via Blockfrost REST, assembles the tx
 * with `@cardano-sdk/core`, and returns CBOR for Lace's tx-executor to sign +
 * submit (the executor emits the owner vkey witness the scripts require).
 *
 * Fee: the ledger minimum for the built tx — `min_fee_b + min_fee_a × size`
 * (protocol parameters via Blockfrost), sized against the *signed* tx (a dummy
 * vkey witness stands in for the signature the executor adds). Funded from the
 * timelocks' own min-ADA, so no wallet input / coin-selection is needed.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { realfiDebugLog } from '@lace-contract/realfi-staking';

import { blockfrostRestBase, blockfrostRestHeaders } from './realfi-blockfrost';
import { ownerKeyHash, timelockNativeScript } from './realfi-timelock';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';
import type { RealFiWithdrawableUnstake } from '@lace-contract/realfi-staking';

/** Validity window (slots ≈ seconds) after the tip for the claim to be submitted. */
const TTL_SLOTS = 7200;

export type BuildWithdrawTxParams = {
  config: RealFiNetworkConfig;
  /** Lace's per-network Blockfrost client config (proxy — LW-14499). */
  blockfrost: RealFiBlockfrostConfig;
  /** Timelock owner + funds destination (the staking account's address). */
  changeAddressBech32: string;
  /** Matured timelocks to spend in this single tx. */
  unstakes: RealFiWithdrawableUnstake[];
};

/** Blockfrost request context — the network config + resolved project id. */
type BlockfrostContext = RealFiBlockfrostConfig;

const blockfrostGet = async <T>(
  bf: BlockfrostContext,
  path: string,
): Promise<T> => {
  const base = blockfrostRestBase(bf);
  const response = await fetch(`${base}${path}`, {
    headers: blockfrostRestHeaders(bf),
  });
  if (!response.ok) {
    throw new Error(`Blockfrost ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

type BlockfrostAmount = { unit: string; quantity: string };

/** Resolve the lovelace + USDr held by a single timelock output. */
const resolveTimelockValue = async (
  bf: BlockfrostContext,
  usdrTokenId: string,
  { txHash, index }: { txHash: string; index: number },
): Promise<{ lovelace: bigint; usdr: bigint }> => {
  const utxos = await blockfrostGet<{
    outputs: { output_index: number; amount: BlockfrostAmount[] }[];
  }>(bf, `/txs/${txHash}/utxos`);
  const output = utxos.outputs.find(o => o.output_index === index);
  if (!output) throw new Error(`Timelock output ${txHash}#${index} not found`);
  let lovelace = 0n;
  let usdr = 0n;
  for (const amount of output.amount) {
    if (amount.unit === 'lovelace') lovelace += BigInt(amount.quantity);
    else if (amount.unit === usdrTokenId) {
      usdr += BigInt(amount.quantity);
    }
  }
  return { lovelace, usdr };
};

/**
 * Build the batched claim tx CBOR. One output returns all released USDr (+ the
 * timelocks' ADA minus the flat fee) to the owner; one native script per
 * distinct unlock slot witnesses the inputs; `invalidBefore = max(unlockSlot)`.
 */
export const buildWithdrawUnsignedTx = async (
  params: BuildWithdrawTxParams,
): Promise<{ cbor: string; feeLovelace: string }> => {
  const { config, blockfrost, unstakes } = params;
  if (unstakes.length === 0)
    throw new Error('No matured timelocks to withdraw');
  realfiDebugLog('withdraw-tx: building', {
    count: unstakes.length,
    network: config.blockfrostNetwork,
    utxos: unstakes.map(
      u => `${u.timelockUtxo.txHash}#${u.timelockUtxo.index}`,
    ),
  });

  const owner = ownerKeyHash(params.changeAddressBech32);
  const ownerAddress = Cardano.PaymentAddress(params.changeAddressBech32);
  const bf: BlockfrostContext = blockfrost;

  // Resolve each timelock's value + accumulate the totals.
  const resolved = await Promise.all(
    unstakes.map(async unstake =>
      resolveTimelockValue(bf, config.usdrTokenId, unstake.timelockUtxo),
    ),
  );
  const totalLovelace = resolved.reduce((sum, v) => sum + v.lovelace, 0n);
  const totalUsdr = resolved.reduce((sum, v) => sum + v.usdr, 0n);
  realfiDebugLog('withdraw-tx: resolved utxos', {
    totalLovelace: totalLovelace.toString(),
    totalUsdr: totalUsdr.toString(),
  });

  const inputs: Cardano.TxIn[] = unstakes.map(unstake => ({
    txId: Cardano.TransactionId(unstake.timelockUtxo.txHash),
    index: unstake.timelockUtxo.index,
  }));

  // One native script per distinct unlock slot (an input is matched to its
  // script by hash); `invalidBefore` is the latest slot so every RequireTimeAfter
  // is satisfied by the single validity interval.
  const slots = [...new Set(unstakes.map(u => u.unlockSlot))];
  const scripts: Cardano.Script[] = slots.map(slot =>
    timelockNativeScript(owner, slot),
  );
  const maxUnlockSlot = Math.max(...slots);

  const [tip, feeParams] = await Promise.all([
    blockfrostGet<{ slot: number }>(bf, '/blocks/latest'),
    blockfrostGet<{
      min_fee_a: number;
      min_fee_b: number;
      coins_per_utxo_size: string;
    }>(bf, '/epochs/latest/parameters'),
  ]);
  realfiDebugLog('withdraw-tx: tip fetched', {
    tipSlot: tip.slot,
    maxUnlockSlot,
    feeParams,
  });

  const assets = new Map<Cardano.AssetId, bigint>([
    [Cardano.AssetId(config.usdrTokenId), totalUsdr],
  ]);
  const claimBody = (fee: bigint): Cardano.TxBody => ({
    inputs,
    outputs: [
      {
        address: ownerAddress,
        value: { coins: totalLovelace - fee, assets },
      },
    ],
    fee,
    validityInterval: {
      invalidBefore: Cardano.Slot(maxUnlockSlot),
      invalidHereafter: Cardano.Slot(tip.slot + TTL_SLOTS),
    },
    // The scripts require the owner's signature; declare it so Lace's signer
    // emits the vkey witness (the inputs sit at script addresses, not the
    // wallet's, so it isn't inferred from input resolution).
    requiredExtraSignatures: [owner],
  });

  // The fee must price the SIGNED size — the executor adds one Ed25519 vkey
  // witness later, so measurement injects a dummy of the same encoded width.
  const dummySignatures = new Map([
    ['0'.repeat(64), '0'.repeat(128)],
  ]) as unknown as Cardano.Tx['witness']['signatures'];
  const signedSizeBytes = (fee: bigint): number => {
    const body = claimBody(fee);
    const sized: Cardano.Tx = {
      id: Serialization.TransactionBody.fromCore(body).hash(),
      body,
      witness: { signatures: dummySignatures, scripts },
    };
    return Serialization.Transaction.fromCore(sized).toCbor().length / 2;
  };
  // Ledger min fee: min_fee_b + min_fee_a × size. The fee value feeds back into
  // the size (CBOR int width of fee and change coins), so iterate to fixpoint —
  // converges on the second pass for any realistic claim.
  let fee = BigInt(feeParams.min_fee_b);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const next =
      BigInt(feeParams.min_fee_b) +
      BigInt(feeParams.min_fee_a) * BigInt(signedSizeBytes(fee));
    if (next === fee) break;
    fee = next;
  }
  realfiDebugLog('withdraw-tx: fee computed', { fee });

  // Ledger-validity guards (the claim is funded ONLY from the timelocks' own
  // min-ADA — there is no wallet input to top it up): a fee at or above the
  // timelocks' ADA would build a negative/zero return output, and a return
  // output below the Babbage min-ADA for its size would be rejected with
  // OutputTooSmallUTxO at submission. Failing the BUILD keeps the money and
  // gives the sheet's error path a readable reason instead of a node error.
  if (fee >= totalLovelace) {
    throw new Error(
      `Claim fee ${fee} lovelace exceeds the timelocks' own ADA ` +
        `${totalLovelace} — the claim cannot fund itself`,
    );
  }
  const returnOutput = claimBody(fee).outputs[0];
  const returnOutputBytes = BigInt(
    Serialization.TransactionOutput.fromCore(returnOutput).toCbor().length / 2,
  );
  // Babbage rule: minCoin = coinsPerUtxoByte × (160 + serialized output size).
  const minReturnCoin =
    BigInt(feeParams.coins_per_utxo_size) * (160n + returnOutputBytes);
  if (totalLovelace - fee < minReturnCoin) {
    throw new Error(
      `Claim return output would carry ${totalLovelace - fee} lovelace, ` +
        `below the ledger minimum ${minReturnCoin} for a token-carrying ` +
        `output (OutputTooSmallUTxO) — the timelocks' ADA cannot cover ` +
        `fee + min-ADA`,
    );
  }

  const body = claimBody(fee);
  const tx: Cardano.Tx = {
    id: Serialization.TransactionBody.fromCore(body).hash(),
    body,
    // Native scripts belong in the witness set, matched to inputs by hash.
    witness: { signatures: new Map(), scripts },
  };
  const cbor = Serialization.Transaction.fromCore(tx).toCbor();
  realfiDebugLog('withdraw-tx: serialized', { cborLength: cbor.length });
  return { cbor, feeLovelace: fee.toString() };
};
