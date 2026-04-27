import type { Cardano } from '@cardano-sdk/core';

/**
 * Computes the total value of collateral inputs by resolving each input
 * and summing the coins from all resolved UTXOs.
 *
 * @param collateralInputs - Array of collateral input references (txId and index)
 * @param inputResolver - Resolver function to look up UTXOs for inputs
 * @returns Promise resolving to the total collateral value in lovelace
 */
export const computeCollateralValue = async (
  collateralInputs: ReadonlyArray<{ txId: string; index: number }>,
  inputResolver: Cardano.InputResolver,
): Promise<bigint> => {
  if (collateralInputs.length === 0) {
    return BigInt(0);
  }

  let totalCollateral = BigInt(0);

  for (const input of collateralInputs) {
    try {
      const txIn: Cardano.TxIn = {
        txId: input.txId as Cardano.TransactionId,
        index: input.index,
      };

      const resolvedOutput = await inputResolver.resolveInput(txIn);
      if (resolvedOutput) {
        totalCollateral += resolvedOutput.value.coins;
      }
    } catch {
      /* Silently handle resolution failures - return partial sum */
    }
  }

  return totalCollateral;
};
