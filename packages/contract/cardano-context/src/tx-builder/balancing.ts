import {
  Cardano,
  coalesceValueQuantities,
  Serialization,
  subtractValueQuantities,
} from '@cardano-sdk/core';
import { minAdaRequired, minFee } from '@cardano-sdk/tx-construction';

import { getUniqueSignerKeyHashes } from '../signing/getUniqueSigners';

import type { RequiredProtocolParameters } from '../types';
import type {
  BalanceTransactionParams,
  IsTransactionBalancedParams,
} from './types';

const MAX_BALANCE_ITERATIONS = 20;

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
 * Parameters for {@link addChangeOutput}.
 *
 * @property body - Transaction body to which a change output may be appended.
 * @property protocolParameters - Protocol parameters (for Min-ADA calculation).
 * @property changeAddress - Address where change should be sent.
 * @property change - The computed change value to return.
 */
type AddChangeOutputParams = {
  body: Cardano.TxBody;
  protocolParameters: RequiredProtocolParameters;
  changeAddress: Cardano.PaymentAddress;
  change: Cardano.Value;
};

/**
 * Adds a change output if the computed `change` meets Min-ADA requirements.
 *
 * If `change.coins` is below the minimum UTxO value for its (potential) multi-asset payload,
 * the function **does not** append the output and instead returns the **required padding**
 * (the missing lovelace) that must be added to `change.coins` to satisfy Min-ADA.
 *
 * If Min-ADA is satisfied, the change output is appended and `0n` is returned.
 *
 * @param params - See {@link AddChangeOutputParams}.
 * @returns `0n` if the change was added; otherwise the required lovelace padding.
 */
const addChangeOutput = ({
  body,
  protocolParameters,
  changeAddress,
  change,
}: AddChangeOutputParams): bigint => {
  const changeOutput = {
    address: changeAddress,
    value: change,
  };

  const minUtxoValue = minAdaRequired(
    changeOutput,
    BigInt(protocolParameters.coinsPerUtxoByte),
  );
  const chainCoin = change.coins;

  if (chainCoin < minUtxoValue) {
    return minUtxoValue - chainCoin;
  }

  body.outputs.push(changeOutput);

  return 0n;
};

/**
 * Balances a transaction by selecting inputs, computing fees, and adding change as needed.
 *
 * **Algorithm (high level):**
 * 1. Clone the unbalanced transaction.
 * 2. Compute implicit coin (deposits/withdrawals) and start with a working fee.
 * 3. Derive the **required input value** = `sum(outputs)` - `implicitValue` (which accounts for fee, donation, mint).
 * 4. Use the provided `coinSelector` to pick inputs that satisfy the target value (including assets).
 * 5. Compute **change** = `selectedInputs - requiredInputValue` (+ any pending `changePadding`).
 * 6. If change is non-zero:
 *    - Try to add it as an output; if it fails Min-ADA, return the required padding and retry.
 * 7. Compute the minimum fee (`minFee`) and add the VK-witness cost estimate.
 * 8. If the new fee is higher than the working fee, update the fee and repeat.
 * 9. When stable, verify with {@link isTransactionBalanced}; if not balanced, iterate again.
 *
 * @throws Error If the transaction cannot be balanced after iterations.
 *
 * @param params - See {@link BalanceTransactionParams}.
 * @returns The balanced transaction (with inputs, change, and final fee set).
 */
export const balanceTransaction = ({
  unbalancedTx,
  availableUtxo,
  preSelectedUtxo,
  protocolParameters,
  coinSelector,
  changeAddress,
}: BalanceTransactionParams): Cardano.Tx => {
  let isBalanced = false;

  const implicitCoin = Cardano.util.computeImplicitCoin(
    protocolParameters,
    unbalancedTx.body,
  );
  let fee = unbalancedTx.body.fee;
  const mint = unbalancedTx.body.mint;
  const donation = unbalancedTx.body.donation ?? 0n;
  let balancedTx;
  let changePadding = 0n;

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
        (fee + changePadding + donation),
      assets: mint ?? new Map<Cardano.AssetId, bigint>(),
    };

    const requiredInputValue = subtractValueQuantities([
      totalOutputValue,
      implicitValue,
    ]);

    let { selection } = coinSelector.select({
      preSelectedUtxo,
      availableUtxo,
      targetValue: requiredInputValue,
    });

    // Cardano requires at least one input for transaction validity.
    // When deposit refunds exceed outputs+fees, coin selector may return empty selection.
    // Force-select at least one UTxO in this case.
    if (selection.length === 0 && availableUtxo.length > 0) {
      // Prefer an ADA-only UTxO (no native assets) to avoid complications in change output
      const adaOnlyUtxo = availableUtxo.find(
        utxo => !utxo[1].value.assets || utxo[1].value.assets.size === 0,
      );
      selection = [adaOnlyUtxo ?? availableUtxo[0]];
    }

    body.inputs = selection.map(([input]) => input as Cardano.TxIn);

    const selectedInputValue = coalesceValueQuantities(
      selection.map(([_, output]) => output.value),
    );
    const change = coalesceValueQuantities([
      subtractValueQuantities([selectedInputValue, requiredInputValue]),
      { coins: changePadding, assets: new Map<Cardano.AssetId, bigint>() },
    ]);

    if (!isZeroValue(change)) {
      const padding = addChangeOutput({
        body,
        protocolParameters,
        changeAddress,
        change,
      });

      if (padding > 0) {
        changePadding += padding;
        balancedTx = null;
        ++iterCount;
        continue;
      }
    }

    const uniqueSigners = getUniqueSignerKeyHashes(balancedTx, selection);
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
    throw new Error('Failed to balance transaction');
  }

  return balancedTx;
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
