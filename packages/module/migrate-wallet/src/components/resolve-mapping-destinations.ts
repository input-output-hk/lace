import type { AccountMapping, MigrationMode } from '../store/slice';

/**
 * Where each mapping row's funds actually land, given the chosen mode.
 *
 * The plan assigns one destination index per source account before the mode is
 * chosen, because discovery runs first. Consolidation then spends every account
 * into ONE destination — the plan's first row — so a row's own planned index is
 * not its destination, and rendering it produced a card that contradicted
 * itself: "combined into Cardano #2" above rows reading #2, #3 and #4.
 */
export const resolveMappingDestinations = (
  accountMapping: AccountMapping,
  migrationMode: MigrationMode | undefined,
): AccountMapping =>
  migrationMode === 'consolidate' && accountMapping.length > 0
    ? accountMapping.map(row => ({
        ...row,
        destinationAccountIndex: accountMapping[0].destinationAccountIndex,
      }))
    : accountMapping;
