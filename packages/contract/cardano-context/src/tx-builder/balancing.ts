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

const BALANCE_EXHAUSTED_MESSAGE = 'Failed to balance transaction';

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
 * The estimate treats witness data as:
 * - A fixed 3-byte "tag" (map key + major type overhead),
 * - The CBOR array header size for `signatureCount` elements,
 * - Plus `101` bytes per witness structure (vkey + signature) as an approximation.
 *
 * The size is then multiplied by `minFeeCoefficient` (aka `a` parameter) to get a fee delta.
 *
 * @param signatureCount - Number of (vkey, signature) pairs expected.
 * @param minFeeCoefficient - Protocol parameter `a` as bigint.
 * @returns Estimated fee contribution for the witness set, in lovelace.
 */
const computeVkWitnessesCost = (
  signatureCount: number,
  minFeeCoefficient: bigint,
): bigint => {
  // Tag 3 bytes + length of the list + 101 bytes for each structure with 2 fields (signature, public key)
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
 * Recomputes the minimum fee using actual post-evaluation ex-units and, if
 * lower than the seeded fee, returns corrected outputs (the largest change
 * output at `changeAddress` increased by the saving) and the corrected fee.
 * Returns the original values unchanged when no correction is possible (no
 * change output at changeAddress) or when the evaluated fee is not lower.
 */
export const correctFeeAfterEvaluation = ({
  balancedTx,
  evaluatedRedeemers,
  resolvedInputs,
  protocolParameters,
  changeAddress,
}: {
  balancedTx: Cardano.Tx;
  evaluatedRedeemers: Cardano.Redeemer[];
  resolvedInputs: Cardano.Utxo[];
  protocolParameters: RequiredProtocolParameters;
  changeAddress: Cardano.PaymentAddress;
}): { outputs: Cardano.TxOut[]; fee: Cardano.Lovelace } => {
  const txWithEvaluation: Cardano.Tx = {
    ...balancedTx,
    witness: { ...balancedTx.witness, redeemers: evaluatedRedeemers },
  };
  const uniqueSigners = getUniqueSignerKeyHashes(
    txWithEvaluation,
    resolvedInputs,
  );
  const vkCost = computeVkWitnessesCost(
    uniqueSigners.size,
    BigInt(protocolParameters.minFeeCoefficient),
  );
  const evaluatedFee =
    minFee(txWithEvaluation, resolvedInputs, protocolParameters) + vkCost;
  const currentFee = balancedTx.body.fee;
  if (evaluatedFee >= currentFee) {
    return { outputs: balancedTx.body.outputs, fee: currentFee };
  }
  const saving = currentFee - evaluatedFee;
  const outputs = balancedTx.body.outputs;
  let changeIndex = -1;
  for (let index = 0; index < outputs.length; index++) {
    if (
      outputs[index].address === changeAddress &&
      (changeIndex < 0 ||
        outputs[index].value.coins > outputs[changeIndex].value.coins)
    ) {
      changeIndex = index;
    }
  }
  if (changeIndex < 0) {
    return { outputs, fee: currentFee };
  }
  const correctedOutputs = [...outputs];
  correctedOutputs[changeIndex] = {
    ...correctedOutputs[changeIndex],
    value: {
      ...correctedOutputs[changeIndex].value,
      coins: correctedOutputs[changeIndex].value.coins + saving,
    },
  };
  return { outputs: correctedOutputs, fee: evaluatedFee };
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
