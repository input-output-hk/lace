import { Serialization } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

/** Bytes per tier of Conway's reference-script fee. */
const REFERENCE_SCRIPT_FEE_TIER_BYTES = 25_600;

/** Growth of the per-byte reference-script price from one tier to the next. */
const REFERENCE_SCRIPT_FEE_TIER_MULTIPLIER = 1.2;

/**
 * Bytes of reference script the ledger reads for `inputs`: the scripts carried
 * by the outputs they resolve to in `resolvedInputs`. An input missing from
 * `resolvedInputs` adds nothing.
 *
 * Each script is measured as `@cardano-sdk/tx-construction`'s `minFee`
 * measures it, over its tagged CBOR encoding. That is a few bytes per script
 * above the ledger's count, so a bound or fee derived from it never falls
 * short of what the ledger charges.
 */
export const referenceScriptSize = (
  inputs: readonly Cardano.TxIn[],
  resolvedInputs: readonly Cardano.Utxo[],
): number => {
  let size = 0;
  for (const input of inputs) {
    const script = resolvedInputs.find(
      ([txIn]) => txIn.txId === input.txId && txIn.index === input.index,
    )?.[1].scriptReference;
    if (script) {
      size += Serialization.Script.fromCore(script).toCbor().length / 2;
    }
  }
  return size;
};

/**
 * The reference-script fee for `size` bytes, priced in tiers whose per-byte
 * price grows by {@link REFERENCE_SCRIPT_FEE_TIER_MULTIPLIER} every
 * {@link REFERENCE_SCRIPT_FEE_TIER_BYTES}, exactly as `minFee` prices it.
 */
export const referenceScriptFee = (
  size: number,
  {
    minFeeRefScriptCostPerByte,
  }: Pick<Cardano.ProtocolParameters, 'minFeeRefScriptCostPerByte'>,
): bigint => {
  let pricePerByte = minFeeRefScriptCostPerByte
    ? Number(minFeeRefScriptCostPerByte)
    : 0;
  let fee = 0;
  for (
    let remaining = size;
    remaining > 0;
    remaining -= REFERENCE_SCRIPT_FEE_TIER_BYTES
  ) {
    fee += Math.ceil(
      Math.min(REFERENCE_SCRIPT_FEE_TIER_BYTES, remaining) * pricePerByte,
    );
    pricePerByte *= REFERENCE_SCRIPT_FEE_TIER_MULTIPLIER;
  }
  return BigInt(fee);
};
