import { isMigratableRow } from '../slice';

import type { AccountMapping } from '../slice';

/**
 * The row a consolidating sweep lands in — its position in the plan and the
 * destination account index it names — or `undefined` when the plan has none,
 * in which case callers fall back to the account the user picked.
 *
 * Consolidation spends every row's UTxOs into this one account, so the choice
 * is not about which rows migrate; it is about which row carries an index that
 * was actually checked. The freshness probe resolves indexes for the rows
 * `isMigratableRow` accepts, so selecting by that same predicate is what keeps
 * the sweep, the probe and the review naming one account. Any other row's
 * index is the plan's unchecked guess, and landing on it breaks FR-13.
 */
export const consolidateLandingRow = (
  accountMapping: AccountMapping,
): { position: number; destinationAccountIndex: number } | undefined => {
  const position = accountMapping.findIndex(isMigratableRow);
  return position === -1
    ? undefined
    : {
        position,
        destinationAccountIndex:
          accountMapping[position].destinationAccountIndex,
      };
};
