import {
  Cardano,
  coalesceValueQuantities,
  Serialization,
  subtractValueQuantities,
} from '@cardano-sdk/core';
import { minAdaRequired, minFee } from '@cardano-sdk/tx-construction';

import { buildChangeOutputs } from '../input-selection/change-builder';
import { InputSelectionError } from '../input-selection/InputSelectionError';
import { getUniqueSignerKeyHashes } from '../signing/getUniqueSigners';

import type { RequiredProtocolParameters } from '../types';
import type {
  BalanceTransactionParams,
  IsTransactionBalancedParams,
} from './types';

const MAX_BALANCE_ITERATIONS = 20;

// Fee-correction fixpoint bound. The correction lowers the fee toward the true
// minimum over the final shipped body; for the cNIGHT designation tx (the sole
// Plutus consumer) the collateral/change coin fields sit far from any CBOR
// width boundary, so it converges in <=3 steps. The bound is a runaway guard.
const MAX_FEE_CORRECTION_ITERATIONS = 5;

const BALANCE_EXHAUSTED_MESSAGE = 'Failed to balance transaction';

/**
 * The subset of the tx body the Plutus collateral reservation contributes.
 * Derived per-candidate-fee during fee correction so the fee is priced over
 * the exact fields that ship (see {@link correctFeeAfterEvaluation}).
 */
export type CollateralBodyFields = Pick<
  Cardano.TxBody,
  'collateralReturn' | 'totalCollateral'
>;

type BalancingLoopParams = Omit<
  BalanceTransactionParams,
  'fallbackCoinSelector'
>;

/**
 * Coalesces the values of all inputs (by looking them up in `resolvedInputs`).
 *
 * For each input in `inputs`, finds the matching UTxO in `resolvedInputs` and gathers its value;
 * if not found, uses a zero value. Finally, sums all values (ADA + multi-asset) into a single
 * value.
 *
 * @param inputs - Transaction inputs to evaluate.
 * @param resolvedInputs - Resolved UTxOs that contain the actual output values.
 * @returns The combined value of all inputs (missing inputs contribute zero).
 */
const coalesceValueQuantitiesInInputs = (
  inputs: Cardano.TxIn[],
  resolvedInputs: Cardano.Utxo[],
): Cardano.Value => {
  const inputValues = inputs.map(input => {
    const utxo = resolvedInputs.find(
      element =>
        element[0].txId === input.txId && element[0].index === input.index,
    );
    return utxo
      ? utxo[1].value
      : { coins: 0n, assets: new Map<Cardano.AssetId, bigint>() };
  });
  return coalesceValueQuantities(inputValues);
};

/**
 * Checks whether a value is exactly zero for both ADA and all assets.
 *
 * @param value - Value to test.
 * @returns `true` if `coins === 0n` and all asset quantities are `0n`; otherwise `false`.
 */
const isZeroValue = (value: Cardano.Value): boolean => {
  if (value.coins !== 0n) return false;
  if (value.assets) {
    for (const amount of value.assets.values()) {
      if (amount !== 0n) return false;
    }
  }
  return true;
};

/**
 * Deep-clones a transaction by converting to/from the serialization format.
 *
 * @param tx - Transaction to clone.
 * @returns A structurally equivalent (detached) copy.
 */
const cloneTx = (tx: Cardano.Tx): Cardano.Tx => {
  return Serialization.Transaction.fromCore(tx).toCore();
};

/**
 * Computes the size, in bytes, of a CBOR array header for a given element count.
 *
 * @param elementCount - Number of elements in the array.
 * @returns The header size in bytes as a bigint (`1n`, `2n`, `3n`, or `5n`).
 */
const cborArrayHeaderSize = (elementCount: number): bigint => {
  if (elementCount <= 23) {
    return 1n;
  } else if (elementCount <= 255) {
    return 2n;
  } else if (elementCount <= 65535) {
    return 3n;
  } else {
    return 5n;
  }
};

/**
 * Estimates the additional fee attributable to VK witnesses (vkey + signature pairs).
 *
 * The 3-byte framing term is deliberately one byte under the wire encoding,
 * whose framing for a signed tx is 4 bytes (map key `0x00` + the 3-byte Conway
 * set tag 258). That missing byte cancels the `isValid` byte the ledger's
 * fee-size omits (`toCBORForSizeComputation` prices the tx without it), so the
 * estimate lands exactly on the ledger minimum for any tx with at least one
 * signer — independent of signer count, since the map key is emitted once. Do
 * not "fix" the 3n to 4n: that overpays by one byte per tx and fails the
 * drift-guard test in TransactionBuilder.test.ts, which pins this delta
 * against the serializer. At 0 signers the framing is over-counted (the wire
 * witness set stays `a0`) — an overpay, never an underpay.
 *
 * @param signatureCount - Number of (vkey, signature) pairs expected.
 * @param minFeeCoefficient - Protocol parameter `a` as bigint.
 * @returns Estimated fee contribution for the witness set, in lovelace.
 */
const computeVkWitnessesCost = (
  signatureCount: number,
  minFeeCoefficient: bigint,
): bigint => {
  // Framing (one byte under wire — see above) + array header + 101 bytes per
  // (vkey, signature) pair
  const vkWitnessSetSize =
    3n + cborArrayHeaderSize(signatureCount) + 101n * BigInt(signatureCount);
  return vkWitnessSetSize * minFeeCoefficient;
};

/**
 * Verifies that every change output meets the minimum UTxO value (min-ADA)
 * rule.
 *
 * Change may come from the coin selector or from the forced-selection
 * fallback; this guard surfaces an invalid change output immediately instead
 * of producing an invalid transaction.
 *
 * @param changeOutputs - The change outputs to verify.
 * @param protocolParameters - Protocol parameters (for min-ADA calculation).
 * @throws Error When a change output holds less than its min-ADA requirement.
 */
const assertChangeOutputsMeetMinAda = (
  changeOutputs: Cardano.TxOut[],
  protocolParameters: RequiredProtocolParameters,
): void => {
  for (const changeOutput of changeOutputs) {
    const minUtxoValue = minAdaRequired(
      changeOutput,
      BigInt(protocolParameters.coinsPerUtxoByte),
    );
    if (changeOutput.value.coins < minUtxoValue) {
      throw new Error(
        `Change output is below the minimum UTxO value: holds ${changeOutput.value.coins} lovelace, requires ${minUtxoValue}`,
      );
    }
  }
};

/**
 * Runs the fee-convergence balancing loop with a single coin selector.
 *
 * **Algorithm (high level):**
 * 1. Clone the unbalanced transaction.
 * 2. Compute implicit coin (deposits/withdrawals) and start with a working fee.
 * 3. Derive the **required input value** = `sum(outputs)` - `implicitValue` (which accounts for fee, donation, mint).
 * 4. Use the provided `coinSelector` to pick inputs that satisfy the target value (including assets)
 *    and to build the min-ADA compliant change outputs returning the surplus.
 * 5. Verify the change outputs meet min-ADA and append them to the body.
 * 6. Compute the minimum fee (`minFee`) and add the VK-witness cost estimate.
 * 7. If the new fee is higher than the working fee, update the fee and repeat.
 * 8. When stable, verify with {@link isTransactionBalanced}; if not balanced, iterate again.
 *
 * @throws Error If the transaction cannot be balanced after iterations.
 *
 * @param params - See {@link BalanceTransactionParams}.
 * @returns The balanced transaction (with inputs, change, and final fee set).
 */
const runBalancingLoop = ({
  unbalancedTx,
  availableUtxo,
  preSelectedUtxo,
  collateralUtxos,
  protocolParameters,
  coinSelector,
  changeAddress,
}: BalancingLoopParams): { tx: Cardano.Tx; selection: Cardano.Utxo[] } => {
  let isBalanced = false;

  const implicitCoin = Cardano.util.computeImplicitCoin(
    protocolParameters,
    unbalancedTx.body,
  );
  let fee = unbalancedTx.body.fee;
  const mint = unbalancedTx.body.mint;
  const donation = unbalancedTx.body.donation ?? 0n;
  let balancedTx;
  let selection: Cardano.Utxo[] = [];

  let iterCount = 0;
  while (!isBalanced && iterCount < MAX_BALANCE_ITERATIONS) {
    balancedTx = cloneTx(unbalancedTx);
    const body = balancedTx.body;
    const outputs = body.outputs;

    balancedTx.body.fee = fee;

    const totalOutputValue = coalesceValueQuantities(
      outputs.map(output => output.value),
    );

    const implicitValue = {
      coins:
        (implicitCoin.withdrawals ?? 0n) +
        (implicitCoin.reclaimDeposit ?? 0n) -
        (implicitCoin.deposit ?? 0n) -
        (fee + donation),
      assets: mint ?? new Map<Cardano.AssetId, bigint>(),
    };

    const requiredInputValue = subtractValueQuantities([
      totalOutputValue,
      implicitValue,
    ]);

    let changeOutputs: Cardano.TxOut[];
    ({ selection, changeOutputs } = coinSelector.select({
      preSelectedUtxo,
      availableUtxo,
      targetValue: requiredInputValue,
      outputsToCover: outputs,
      changeAddress,
      protocolParameters,
    }));

    // Cardano requires at least one input for transaction validity.
    // When deposit refunds exceed outputs+fees, coin selector may return empty selection.
    // Force-select at least one UTxO in this case.
    if (selection.length === 0 && availableUtxo.length > 0) {
      // Prefer an ADA-only UTxO (no native assets) to avoid complications in change output
      const adaOnlyUtxo = availableUtxo.find(
        utxo => !utxo[1].value.assets || utxo[1].value.assets.size === 0,
      );
      const forcedUtxo = adaOnlyUtxo ?? availableUtxo[0];

      // The selector's change did not account for the forced input; rebuild it
      // through buildChangeOutputs, not as a raw `forcedUtxo - target` output:
      // raw change can sit below min-ADA or exceed maxValueSize, failing the
      // build with an error the fallback selector cannot recover from.
      ({ selection, changeOutputs } = buildChangeOutputs({
        selection: [forcedUtxo],
        remaining: availableUtxo.filter(utxo => utxo !== forcedUtxo),
        targetValue: requiredInputValue,
        changeAddress,
        protocolParameters,
      }));
    }

    body.inputs = selection.map(([input]) => input as Cardano.TxIn);

    assertChangeOutputsMeetMinAda(changeOutputs, protocolParameters);
    body.outputs.push(...changeOutputs);

    const uniqueSigners = getUniqueSignerKeyHashes(balancedTx, [
      ...selection,
      ...(collateralUtxos ?? []),
    ]);
    const vkWitnessesCost = computeVkWitnessesCost(
      uniqueSigners.size,
      BigInt(protocolParameters.minFeeCoefficient),
    );
    const computedFee =
      minFee(balancedTx, selection, protocolParameters) + vkWitnessesCost;

    if (computedFee > fee) {
      fee = computedFee;
      body.fee = fee;
      ++iterCount;
      continue;
    }

    isBalanced = isTransactionBalanced({
      transaction: balancedTx,
      resolvedInputs: selection,
      protocolParameters,
    });

    ++iterCount;
  }

  if (!balancedTx || !isBalanced) {
    throw new Error(BALANCE_EXHAUSTED_MESSAGE);
  }

  return { tx: balancedTx, selection };
};

/**
 * Failures the fallback selector may recover from: the selector giving up
 * ({@link InputSelectionError}) or the loop exhausting its iterations.
 * Anything else (e.g. a selector violating the min-ADA change contract)
 * indicates a bug and must surface unchanged.
 */
const isRecoverableBySelectorSwap = (error: unknown): boolean =>
  error instanceof InputSelectionError ||
  (error instanceof Error && error.message === BALANCE_EXHAUSTED_MESSAGE);

/**
 * Wraps the fallback selector's failure so callers can tell that both
 * selection strategies were exhausted. The fallback error is surfaced rather
 * than the primary one because the deterministic fallback gives the most
 * actionable diagnosis: a `BalanceInsufficient` from Large-First proves the
 * funds genuinely cannot cover the target. An {@link InputSelectionError}
 * keeps its `failure` discriminator so genuine insufficiency remains
 * detectable.
 */
const asFallbackFailure = (fallbackError: unknown): Error => {
  const message =
    fallbackError instanceof Error
      ? fallbackError.message
      : String(fallbackError);
  const wrappedMessage = `${BALANCE_EXHAUSTED_MESSAGE} with fallback coin selector: ${message}`;
  return fallbackError instanceof InputSelectionError
    ? new InputSelectionError(fallbackError.failure, wrappedMessage)
    : new Error(wrappedMessage);
};

/**
 * Balances a transaction by selecting inputs, computing fees, and adding
 * change as needed (see {@link runBalancingLoop} for the algorithm).
 *
 * When the primary `coinSelector` path fails recoverably (it threw an
 * {@link InputSelectionError} or the loop exhausted its iterations) and a
 * distinct `fallbackCoinSelector` is configured, the entire loop is re-run
 * once with the fallback. The fallback re-runs the whole loop rather than a
 * single iteration: randomized selectors re-seed per call, so their
 * fee-convergence iterations are progressive and a mid-loop selector swap
 * would break convergence.
 *
 * @throws Error If the transaction cannot be balanced; when the fallback was
 *   attempted its failure is surfaced, annotated as a fallback failure.
 *
 * @param params - See {@link BalanceTransactionParams}.
 * @returns The balanced transaction (with inputs, change, and final fee set).
 */
export const balanceTransaction = ({
  fallbackCoinSelector,
  ...loopParams
}: BalanceTransactionParams): { tx: Cardano.Tx; selection: Cardano.Utxo[] } => {
  try {
    return runBalancingLoop(loopParams);
  } catch (error) {
    if (
      !fallbackCoinSelector ||
      fallbackCoinSelector === loopParams.coinSelector ||
      !isRecoverableBySelectorSwap(error)
    ) {
      throw error;
    }
    try {
      return runBalancingLoop({
        ...loopParams,
        coinSelector: fallbackCoinSelector,
      });
    } catch (fallbackError) {
      throw asFallbackFailure(fallbackError);
    }
  }
};

/**
 * Corrects the fee downward after ex-unit evaluation, pricing `minFee` over the
 * EXACT body that will ship: post-evaluation redeemers, the real
 * `scriptIntegrityHash`, the fee-derived collateral fields, and the largest
 * change output at `changeAddress` credited with the fee saving. Because the
 * collateral fields' size depends on the fee (a smaller fee shrinks the
 * collateral, which can add a collateral-return output) and the fee depends on
 * the body's size, it iterates to a fixpoint, accepting a candidate fee only
 * when that fee covers its own shipped body (`requiredFee <= fee`).
 *
 * Pricing over a stale pre-finalisation body under-priced the fee whenever
 * finalisation changed the collateral fields' size — e.g. a collateral input
 * summing to the coverage target seeds no collateral-return, but the smaller
 * fee-derived collateral does emit one, adding ~66 bytes the fee never saw
 * (Conway `FeeTooSmallUTxO`).
 *
 * Returns the shipped `outputs`, `fee`, and `collateralFields` so the caller
 * can ship exactly what was priced. The fee is never raised above
 * `balancedTx.body.fee` (the balancer already funded that from inputs); with no
 * change output there is nowhere to refund a saving, so the balanced fee ships
 * unchanged.
 *
 * @throws Error When the balanced fee does not cover the body that would ship —
 *   the shipped fee is always one proven to cover its own body, and raising it
 *   would need a re-balance this function cannot perform.
 */
export const correctFeeAfterEvaluation = ({
  balancedTx,
  evaluatedRedeemers,
  resolvedInputs,
  protocolParameters,
  changeAddress,
  scriptIntegrityHash,
  deriveCollateralFields,
}: {
  balancedTx: Cardano.Tx;
  evaluatedRedeemers: Cardano.Redeemer[];
  resolvedInputs: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
  changeAddress: Cardano.PaymentAddress;
  scriptIntegrityHash?: Cardano.TxBody['scriptIntegrityHash'];
  deriveCollateralFields: (fee: Cardano.Lovelace) => CollateralBodyFields;
}): {
  outputs: Cardano.TxOut[];
  fee: Cardano.Lovelace;
  collateralFields: CollateralBodyFields;
} => {
  const seedFee = balancedTx.body.fee;
  const witness = { ...balancedTx.witness, redeemers: evaluatedRedeemers };
  const uniqueSigners = getUniqueSignerKeyHashes(
    { ...balancedTx, witness },
    resolvedInputs,
  );
  const vkCost = computeVkWitnessesCost(
    uniqueSigners.size,
    BigInt(protocolParameters.minFeeCoefficient),
  );

  const baseOutputs = balancedTx.body.outputs;
  let changeIndex = -1;
  for (let index = 0; index < baseOutputs.length; index++) {
    if (
      baseOutputs[index].address === changeAddress &&
      (changeIndex < 0 ||
        baseOutputs[index].value.coins > baseOutputs[changeIndex].value.coins)
    ) {
      changeIndex = index;
    }
  }

  // Build the exact body shipped at `fee` and return its required minimum fee.
  // `collateralReturn: undefined` clears any pre-balance seeded return before
  // the fee-derived fields re-add it, so the priced body equals the ship body.
  const priceAt = (
    fee: Cardano.Lovelace,
  ): {
    requiredFee: Cardano.Lovelace;
    outputs: Cardano.TxOut[];
    collateralFields: CollateralBodyFields;
  } => {
    const collateralFields = deriveCollateralFields(fee);
    const outputs = [...baseOutputs];
    const saving = seedFee - fee;
    if (changeIndex >= 0 && saving > 0n) {
      outputs[changeIndex] = {
        ...outputs[changeIndex],
        value: {
          ...outputs[changeIndex].value,
          coins: outputs[changeIndex].value.coins + saving,
        },
      };
    }
    const candidate: Cardano.Tx = {
      ...balancedTx,
      body: {
        ...balancedTx.body,
        fee,
        outputs,
        scriptIntegrityHash:
          scriptIntegrityHash ?? balancedTx.body.scriptIntegrityHash,
        collateralReturn: undefined,
        ...collateralFields,
      },
      witness,
    };
    const requiredFee =
      minFee(candidate, resolvedInputs, protocolParameters) + vkCost;
    return { requiredFee, outputs, collateralFields };
  };

  // The fee is never raised here, so a shipped body needing more than the fee
  // covers cannot be fixed by this function — it needs a re-balance. Fail loudly
  // instead of shipping a body Conway rejects with FeeTooSmallUTxO.
  const assertFunded = (
    required: Cardano.Lovelace,
    fee: Cardano.Lovelace,
  ): void => {
    if (required > fee) {
      throw new Error(
        `Evaluated transaction body requires ${required} lovelace of fee, balanced fee is ${fee}`,
      );
    }
  };

  // No change output → nowhere to refund a saving, so the fee can't be lowered.
  // Ship the balanced fee with its collateral fields, once proven to cover them.
  if (changeIndex < 0) {
    const priced = priceAt(seedFee);
    assertFunded(priced.requiredFee, seedFee);
    return {
      outputs: baseOutputs,
      fee: seedFee,
      collateralFields: priced.collateralFields,
    };
  }

  // Seed at the balancer's fee (priced with the per-tx max SEED ex-units, so the
  // real evaluated body needs less for scripts) and lower it only to a value that
  // still covers its own shipped body.
  let fee = seedFee;
  let priced = priceAt(fee);
  for (
    let iteration = 0;
    iteration < MAX_FEE_CORRECTION_ITERATIONS && priced.requiredFee < fee;
    iteration++
  ) {
    const candidateFee = priced.requiredFee;
    const candidatePriced = priceAt(candidateFee);
    // The candidate fee must cover the body priced at that fee; otherwise keep
    // the last fee that did (guards a coin-width straddle across the step).
    if (candidatePriced.requiredFee > candidateFee) break;
    fee = candidateFee;
    priced = candidatePriced;
  }

  // Covers the seed too: the loop never runs when the seed fee is already short,
  // and is a no-op on every fee the loop did accept.
  assertFunded(priced.requiredFee, fee);

  return {
    outputs: priced.outputs,
    fee,
    collateralFields: priced.collateralFields,
  };
};

/**
 * Verifies whether a transaction is balanced under the provided protocol parameters.
 *
 * Computes:
 * - `totalInputValue` from `resolvedInputs` for all `transaction.body.inputs`
 * - `totalOutputValue` from `transaction.body.outputs`
 * - `implicitValue` from deposits/withdrawals (minus fee and donation)
 * - `netValue` = `(totalOutputValue - totalInputValue) - implicitValue`
 *
 * The transaction is considered balanced if `netValue` is a **zero** value
 * across ADA and all assets.
 *
 * @param params - See {@link IsTransactionBalancedParams}.
 * @returns `true` if balanced; otherwise `false`.
 */
export const isTransactionBalanced = ({
  transaction,
  resolvedInputs,
  protocolParameters,
}: IsTransactionBalancedParams): boolean => {
  const implicitCoin = Cardano.util.computeImplicitCoin(
    protocolParameters,
    transaction.body,
  );
  const mint = transaction.body.mint ?? new Map<Cardano.AssetId, bigint>();
  const donation = transaction.body.donation ?? 0n;
  const fee = transaction.body.fee;
  const implicitCoinValue =
    (implicitCoin.withdrawals ?? 0n) +
    (implicitCoin.reclaimDeposit ?? 0n) -
    (implicitCoin.deposit ?? 0n);

  const implicitValue = {
    coins: implicitCoinValue - (fee + donation),
    assets: mint,
  };

  const outputs = transaction.body.outputs;
  const inputs = transaction.body.inputs;

  const totalOutputValue = coalesceValueQuantities(
    outputs.map(output => output.value),
  );

  const totalInputValue = coalesceValueQuantitiesInInputs(
    inputs,
    resolvedInputs,
  );

  const diffValue = subtractValueQuantities([
    totalOutputValue,
    totalInputValue,
  ]);
  const netValue = subtractValueQuantities([diffValue, implicitValue]);

  return isZeroValue(netValue);
};
