// A copy of @lace-lib/cardano-input-selection's test helper: that package's
// tests depend on this one, so its helpers cannot be imported here.
import type { Cardano } from '@lace-lib/cardano-core';
import type { SelectionConstraints } from '@lace-lib/cardano-input-selection';

export interface MockSelectionConstraints {
  minimumCoinQuantity: bigint;
  minimumCostCoefficient: bigint;
  maxTokenBundleSize: number;
  selectionLimit: number;
}

export const MOCK_NO_CONSTRAINTS: MockSelectionConstraints = {
  maxTokenBundleSize: Number.POSITIVE_INFINITY,
  minimumCoinQuantity: 0n,
  minimumCostCoefficient: 0n,
  selectionLimit: Number.POSITIVE_INFINITY,
};

export const mockConstraintsToConstraints = (
  constraints: MockSelectionConstraints,
): SelectionConstraints => ({
  computeMinimumCoinQuantity: () => constraints.minimumCoinQuantity,
  computeMinimumCost: async ({ inputs }) => ({
    fee: constraints.minimumCostCoefficient * BigInt(inputs.size),
  }),
  computeSelectionLimit: async () => constraints.selectionLimit,
  tokenBundleSizeExceedsLimit: (assets?: Cardano.TokenMap) =>
    (assets?.size || 0) > constraints.maxTokenBundleSize,
});

export const NO_CONSTRAINTS = mockConstraintsToConstraints(MOCK_NO_CONSTRAINTS);
