/**
 * Balances a RealFi order transaction with Lace's TransactionBuilder — no
 * Blaze. The order output arrives as CBOR hex (the direct-USDr stake
 * continuation's address + datum, or the pure /tx-builder's unstake flow),
 * the UTxO set arrives serialized from redux (pending-tx aware —
 * selectAvailableAccountUtxos), and indexer metadata is attached per label.
 * Returns unsigned tx CBOR for Lace's tx-executor to sign + submit.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { computeMinimumCoinQuantity } from '@cardano-sdk/tx-construction';
import { HexBlob } from '@cardano-sdk/util';
import { TransactionBuilder } from '@lace-contract/cardano-context';
import { realfiDebugLog } from '@lace-contract/realfi-staking';

import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';

export type BalanceOrderTxParams = {
  /** Composed order output (address + inline datum + value), CBOR hex. */
  orderOutputCbor: string;
  /** Outputs paid alongside the order (RealFi's processing fee), CBOR hex. */
  extraOutputsCbor?: string[];
  /** Metadata labels to attach (RealFi provenance / unstake indexer). */
  metadata: ReadonlyMap<bigint, Cardano.Metadatum>;
  /** Available account UTxOs, `TransactionUnspentOutput` CBOR hex each. */
  utxos: string[];
  protocolParameters: RequiredProtocolParameters;
  networkMagic: number;
  changeAddressBech32: string;
  ttlSeconds: number;
};

export const balanceOrderTx = async (
  params: BalanceOrderTxParams,
): Promise<string> => {
  // `TransactionUnspentOutput.toCore()` yields a bare `Cardano.TxIn` (on-chain
  // inputs carry no address); re-hydrate it from the paired output's address so
  // the pair satisfies `Cardano.Utxo` (`[HydratedTxIn, TxOut]`) for the builder.
  const availableUtxos: Cardano.Utxo[] = params.utxos.map(cbor => {
    const [txIn, txOut] = Serialization.TransactionUnspentOutput.fromCbor(
      HexBlob(cbor),
    ).toCore();
    return [{ ...txIn, address: txOut.address }, txOut];
  });
  // Blaze's `.complete()` used to validate every output's min-ADA; Lace's
  // TransactionBuilder only computes min-ADA for its own change output, so the
  // caller-supplied outputs must be checked here — an order carrying an
  // inline datum can sit just below the coinsPerUtxoByte floor and get
  // rejected at submit (`OutputTooSmallUTxO`) after a clean build + sign.
  const minCoinOf = computeMinimumCoinQuantity(
    params.protocolParameters.coinsPerUtxoByte,
  );
  const withMinCoin = (cbor: string) => {
    const output = Serialization.TransactionOutput.fromCbor(
      HexBlob(cbor),
    ).toCore();
    const minCoin = BigInt(minCoinOf(output));
    const balanced: Cardano.TxOut =
      output.value.coins < minCoin
        ? { ...output, value: { ...output.value, coins: minCoin } }
        : output;
    return { output, minCoin, balanced };
  };
  const order = withMinCoin(params.orderOutputCbor);
  const extraOutputs = (params.extraOutputsCbor ?? []).map(
    cbor => withMinCoin(cbor).balanced,
  );
  realfiDebugLog('balance: balancing order tx', {
    orderAddress: order.output.address,
    orderCoins: order.output.value.coins,
    orderMinCoin: order.minCoin,
    minAdaBumped: order.output.value.coins < order.minCoin,
    extraOutputCount: extraOutputs.length,
    availableUtxoCount: availableUtxos.length,
    metadataLabels: [...params.metadata.keys()],
    changeAddress: params.changeAddressBech32,
    ttlSeconds: params.ttlSeconds,
  });

  const builder = new TransactionBuilder(
    params.networkMagic,
    params.protocolParameters,
  )
    .setChangeAddress(Cardano.PaymentAddress(params.changeAddressBech32))
    .setUnspentOutputs(availableUtxos)
    .expiresIn(params.ttlSeconds)
    .addOutput(order.balanced);
  for (const output of extraOutputs) {
    builder.addOutput(output);
  }
  for (const [label, metadatum] of params.metadata) {
    builder.setMetadata(label, metadatum);
  }
  const tx = await builder.build();
  const body = tx.toCore().body;
  realfiDebugLog('balance: unsigned tx built', {
    fee: body.fee,
    inputCount: body.inputs.length,
    outputCount: body.outputs.length,
    validityInterval: body.validityInterval,
    unsignedTxCbor: tx.toCbor(),
  });
  return tx.toCbor();
};
