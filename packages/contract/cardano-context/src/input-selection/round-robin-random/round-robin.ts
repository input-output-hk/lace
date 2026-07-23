import {
  InputSelectionError,
  InputSelectionFailure,
} from '../InputSelectionError';

import type { SplitMix64 } from './rng';
import type { SelectionIndex, SelectionProcessor } from './selection-index';

const distance = (a: bigint, b: bigint): bigint => (a > b ? a - b : b - a);

/**
 * Asserts that the pool (pre-selected entries included) can cover every
 * requirement's minimum.
 *
 * @throws {InputSelectionError} With `BalanceInsufficient` and the shortfall
 *   when some requirement cannot be covered.
 */
const assertSufficientBalance = (processors: SelectionProcessor[]): void => {
  for (const { assetId, minimum, poolTotal } of processors) {
    if (poolTotal >= minimum) continue;
    throw new InputSelectionError(
      InputSelectionFailure.BalanceInsufficient,
      assetId
        ? `Insufficient balance for asset ${assetId}: required ${minimum}, available ${poolTotal}`
        : `Insufficient ADA: short by ${minimum - poolTotal} lovelace`,
    );
  }
};

/**
 * Runs the requirements round-robin until none can improve the selection.
 * Each active requirement performs one selection step per cycle; a
 * requirement that fails to improve is deactivated, and the loop ends when a
 * full cycle makes no progress.
 */
const runRoundRobin = (
  index: SelectionIndex,
  rng: SplitMix64,
  targetMultiplier: bigint,
): void => {
  /**
   * Runs a single selection step for a requirement (port of the reference
   * implementation's runSelectionStep). While the selected quantity is below
   * the minimum, any successful pick is accepted. Once at or above the
   * minimum, a pick is accepted only if it moves the selected quantity
   * strictly closer to the improvement target (the minimum times the
   * strategy multiplier); otherwise it is undone.
   *
   * @returns `true` if the step improved the selection, `false` when the
   *   requirement is exhausted.
   */
  const runSelectionStep = (processorIndex: number): boolean => {
    const { minimum, selectedTotal: current } =
      index.processors[processorIndex];

    if (current < minimum) return index.pick(rng, processorIndex);

    const target = minimum * targetMultiplier;
    if (!index.pick(rng, processorIndex)) return false;

    const updated = index.processors[processorIndex].selectedTotal;
    if (distance(target, updated) < distance(target, current)) return true;

    index.undoLastPick();
    return false;
  };

  let hasProgress = true;
  while (hasProgress) {
    hasProgress = false;
    for (const [processorIndex, processor] of index.processors.entries()) {
      if (!processor.isActive) continue;
      if (runSelectionStep(processorIndex)) {
        hasProgress = true;
      } else {
        processor.isActive = false;
      }
    }
  }
};

/**
 * Runs the selection phase: verifies the pool can cover the target, selects
 * inputs via round-robin random-improve, and guarantees a non-empty
 * selection by forcing one lovelace pick when nothing was required.
 *
 * @param index - The selection index, seeded with the pool and requirements.
 * @param rng - The random number generator, freshly seeded for this call.
 * @param targetMultiplier - The improvement target as a multiple of each
 *   requirement's minimum (2 for the optimal strategy, 1 for minimal).
 * @throws {InputSelectionError} With `BalanceInsufficient` when the pool
 *   cannot cover the target, or when the forced lovelace pick fails.
 */
export const runSelectionPhase = (
  index: SelectionIndex,
  rng: SplitMix64,
  targetMultiplier: bigint,
): void => {
  assertSufficientBalance(index.processors);

  runRoundRobin(index, rng, targetMultiplier);

  if (
    index.preSelectedCount === 0 &&
    index.pickCount === 0 &&
    !index.pick(rng, index.lovelaceProcessorIndex)
  ) {
    throw new InputSelectionError(
      InputSelectionFailure.BalanceInsufficient,
      'Cannot select an input: the pool holds no lovelace-bearing UTxO',
    );
  }
};
