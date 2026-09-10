import { isMigratableRow } from '../slice';

import { consolidateLandingRow } from './consolidate-landing-row';

import type { AccountMapping, MigrationMode } from '../slice';

/**
 * The destination account indexes a migration will actually pay into. Empty
 * when the plan names none, in which case callers fall back to the account the
 * user picked.
 *
 * The two modes disagree, and both answers matter to money: preserve pays every
 * funded row's own landing account, consolidate pays exactly one — the landing
 * row's, NOT row 0's, because only a probed row's index has been checked
 * against the chain (see `consolidateLandingRow`).
 *
 * Lives here rather than at either call site because the sweep and the
 * hardware-destination probe must agree about which accounts are involved: a
 * probe that checks one account while the sweep pays another proves nothing.
 * Written out twice, the two drifted.
 */
export const plannedDestinationIndexes = ({
  accountMapping,
  migrationMode,
}: {
  accountMapping: AccountMapping | undefined;
  migrationMode: MigrationMode | undefined;
}): number[] => {
  if (accountMapping === undefined || accountMapping.length === 0) return [];

  // Rewards-only rows are refused in preserve mode (no linkage), so no landing
  // account is created for them either.
  if (migrationMode === 'preserve')
    return accountMapping
      .filter(isMigratableRow)
      .map(row => row.destinationAccountIndex);

  const landing = consolidateLandingRow(accountMapping);
  return landing === undefined ? [] : [landing.destinationAccountIndex];
};
