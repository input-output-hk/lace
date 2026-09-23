/**
 * Locates the order output inside a built order transaction. RealFi's partner
 * attribution claim names the order by `(txHash, outputIndex)`, so the index
 * has to be derived from the very transaction Lace submits — never assumed.
 *
 * Position is not a contract: Lace's `TransactionBuilder` appends change after
 * the order output, but the SundaeSwap composer orders its own outputs, and
 * either may gain outputs (referral fees, collateral return) without notice.
 * Claiming the wrong index attributes someone else's output, so both lookups
 * match on identity — address or inline datum — and fail loudly on a miss.
 */
import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

const outputsOf = (txCbor: string): Serialization.TransactionOutput[] =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor))
    .body()
    .outputs();

/**
 * Index of the output paying `addressBech32`. Used for the direct-USDr stake,
 * whose order output sits at the RealFi stake continuation address — a script
 * address the staker's own change output can never collide with.
 */
export const orderOutputIndexByAddress = (
  txCbor: string,
  addressBech32: string,
): number => {
  const index = outputsOf(txCbor).findIndex(
    output => output.address().toBech32() === addressBech32,
  );
  if (index === -1) {
    throw new Error(
      `No order output paying ${addressBech32} in the built transaction`,
    );
  }
  return index;
};

/**
 * Index of the output carrying `inlineDatumCbor`. Used for swap→stake: the
 * SundaeSwap escrow address is not exposed by the composer, but the order
 * datum it returns is, and it is unique to that output.
 */
export const orderOutputIndexByInlineDatum = (
  txCbor: string,
  inlineDatumCbor: string,
): number => {
  const datum = HexBlob(inlineDatumCbor);
  const index = outputsOf(txCbor).findIndex(
    output => output.datum()?.asInlineData()?.toCbor() === datum,
  );
  if (index === -1) {
    throw new Error(
      'No order output carrying the composed order datum in the built transaction',
    );
  }
  return index;
};
