import { Cardano, Serialization } from '@cardano-sdk/core';
import { TransactionBuilder } from '@lace-contract/cardano-context';
import {
  buildNightDesignationTxBlueprint,
  Ok,
  type CardanoDustNetwork,
  type CardanoPaymentKeyHash,
  type CardanoStakeKeyHash,
  type NightDesignationAction as NightDesignationActionInput,
  type NightDesignationError,
  type Result,
} from '@lace-lib/cnight-dust-designation';

import type * as Crypto from '@cardano-sdk/crypto';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';
import type { HexBlob } from '@cardano-sdk/util';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';

// =====================================================================
// buildNightDesignationTx — map a cNIGHT designation blueprint onto the
// local, provider-dependency-free `TransactionBuilder` and produce an
// unsigned tx.
// =====================================================================
// Pure over its injected `NightDesignationTxBuilderDependencies` (cover
// UTxOs, cost models, input resolver, bounded ex-units evaluator) — no
// network, no Redux — so it unit-tests with fakes. The build side-effect
// assembles the dependencies from account state + the Cardano provider
// and feeds the already-resolved registration UTxO in via `params.action`.
//
// The deterministic Plutus parts (datum, redeemers, script, mint,
// withdrawal, min-utxo) come from `buildNightDesignationTxBlueprint`
// (the `@lace-lib/cnight-dust-designation` primitive); this glue only
// translates that blueprint into generic builder calls. Coin selection,
// balancing, ex-units evaluation, the script-data-hash and collateral
// sizing are the builder's job.
// =====================================================================

export type BuildNightDesignationTxParams = {
  network: CardanoDustNetwork;
  /** Resolved action — for update/deregister this carries the script-address registration UTxO. */
  action: NightDesignationActionInput;
  /** Every cNIGHT UTxO the account controls — all are forced as inputs (rotation). */
  cnightUtxos: Cardano.Utxo[];
  paymentKeyHash: CardanoPaymentKeyHash;
  stakeKeyHash: CardanoStakeKeyHash;
  changeAddress: Cardano.PaymentAddress;
  ttlSlot: Cardano.Slot;
  /** FULL protocol parameters (incl. V3 cost models) — not the cached RequiredProtocolParameters pick. */
  protocolParameters: Cardano.ProtocolParameters;
};

/**
 * Dependencies the local builder needs that are NOT derivable from the
 * blueprint: the network magic, the wallet's ADA-cover UTxO pool (also the
 * collateral source), an input resolver covering every input (script inputs
 * included), and an ex-units evaluator.
 */
export type NightDesignationTxBuilderDependencies = {
  networkMagic: Cardano.NetworkMagics;
  /** Spendable, non-cNIGHT UTxOs — fund the fee + supply collateral. */
  coverUtxos: Cardano.Utxo[];
  /** Resolves every input (cNIGHT, cover, script registration) to its output. */
  inputResolver: Cardano.InputResolver;
  /** Computes redeemer execution units (bounded fixed budget or provider-backed). */
  txEvaluator: TxEvaluator;
};

export type BuildNightDesignationTxResult = {
  cbor: Serialization.TxCBOR;
  txId: Cardano.TransactionId;
  fee: bigint;
};

const toPlutusData = (cbor: HexBlob): Cardano.PlutusData =>
  Serialization.PlutusData.fromCbor(cbor).toCore();

const toKeyHashHex = (bytes: Uint8Array): Crypto.Ed25519KeyHashHex =>
  Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('') as Crypto.Ed25519KeyHashHex;

const sameRef = (a: Cardano.TxIn, b: Cardano.TxIn): boolean =>
  a.txId === b.txId && a.index === b.index;

export const buildNightDesignationTx = async (
  params: BuildNightDesignationTxParams,
  dependencies: NightDesignationTxBuilderDependencies,
): Promise<Result<BuildNightDesignationTxResult, NightDesignationError>> => {
  const blueprintResult = buildNightDesignationTxBlueprint({
    network: params.network,
    cnightUtxos: params.cnightUtxos,
    stakeKeyHash: params.stakeKeyHash,
    paymentKeyHash: params.paymentKeyHash,
    action: params.action,
    coinsPerUtxoByte: params.protocolParameters.coinsPerUtxoByte,
  });
  if (!blueprintResult.ok) return blueprintResult;
  const blueprint = blueprintResult.value;

  const builder = new TransactionBuilder(
    dependencies.networkMagic,
    // Full protocol parameters are a structural superset of the pick.
    params.protocolParameters as RequiredProtocolParameters,
  );

  builder
    .setChangeAddress(params.changeAddress)
    .setUnspentOutputs(dependencies.coverUtxos)
    .setCollateralUtxos(dependencies.coverUtxos)
    .setCollateralChangeAddress(params.changeAddress)
    .setPlutusContext({
      costModels: params.protocolParameters.costModels,
      txEvaluator: dependencies.txEvaluator,
      inputResolver: dependencies.inputResolver,
    });

  // One multi-purpose Plutus V3 script serves mint + spend + withdrawal.
  builder.attachScript({
    __type: Cardano.ScriptType.Plutus,
    version: Cardano.PlutusLanguageVersion.V3,
    bytes: blueprint.scriptCbor,
  });

  // Inputs: every cNIGHT UTxO (the validator's rotation scan) plus, for
  // update/deregister, the registration UTxO spent under the script.
  const registrationRef = blueprint.spendRedeemer?.registrationUtxo[0];
  for (const utxo of blueprint.forcedInputs) {
    if (
      blueprint.spendRedeemer &&
      registrationRef &&
      sameRef(utxo[0], registrationRef)
    ) {
      builder.addInput(utxo, {
        redeemer: toPlutusData(blueprint.spendRedeemer.redeemerCbor),
      });
    } else {
      builder.addInput(utxo);
    }
  }

  // Mint (+1 register) or burn (-1 deregister) the mapping NFT.
  if (blueprint.mint) {
    const assetId = Cardano.AssetId.fromParts(
      blueprint.mint.policyId,
      blueprint.mint.assetName,
    );
    builder.mintAssets(
      new Map([[assetId, blueprint.mint.quantity]]),
      toPlutusData(blueprint.mint.redeemerCbor),
    );
  }

  // Script output carrying the mapping NFT + inline DustMappingDatum.
  if (blueprint.scriptOutput) {
    builder.addOutput({
      address: blueprint.scriptOutput.address,
      value: {
        coins: blueprint.scriptOutput.lovelace,
        assets: new Map([
          [blueprint.scriptOutput.nftAsset, blueprint.scriptOutput.nftQuantity],
        ]),
      },
      datum: toPlutusData(blueprint.scriptOutput.inlineDatumCbor),
    });
  }

  // Script-authorised reward withdrawal (update only).
  if (blueprint.withdrawal) {
    builder.addScriptWithdrawal(
      blueprint.withdrawal.rewardAccount,
      blueprint.withdrawal.lovelace,
      toPlutusData(blueprint.withdrawal.redeemerCbor),
    );
  }

  // extra_signatories — the validator checks the stake-key signature.
  builder.addRequiredSigner(
    toKeyHashHex(blueprint.requiredSigners.paymentKeyHash),
  );
  builder.addRequiredSigner(
    toKeyHashHex(blueprint.requiredSigners.stakeKeyHash),
  );

  builder.setValidityInterval({ invalidHereafter: params.ttlSlot });

  // Let the builder's own failures (InsufficientCollateralError, balancing,
  // ex-units) propagate as-is → the generic build-error copy. Do NOT remap a
  // collateral shortfall to `no-cardano-utxos` ("not enough ADA"): the empty
  // ADA-pool case is caught upstream in the build side-effect; reaching here
  // means the pool is non-empty but collateral (return min-ADA / combined
  // amount) couldn't be satisfied — a different, non-actionable condition.
  const transaction = await builder.build();
  const cbor = transaction.toCbor();
  const fee = transaction.body().fee();

  return Ok({ cbor, txId: transaction.getId(), fee });
};
