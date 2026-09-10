import { describe, expect, it } from 'vitest';

import { plannedDestinationIndexes } from '../../../src/store/helpers/planned-destination-indexes';

import type { AccountMapping } from '../../../src/store/slice';

const row = (
  sourceAccountIndex: number,
  destinationAccountIndex: number,
  { utxoCount = 1, coin = '5000000' } = {},
): AccountMapping[number] => ({
  sourceAccountIndex,
  destinationAccountIndex,
  coin,
  assetCount: 0,
  utxoCount,
});

/** Holds rewards or a registered stake key, but nothing spendable. */
const rewardsOnly = (
  sourceAccountIndex: number,
  destinationAccountIndex: number,
) =>
  row(sourceAccountIndex, destinationAccountIndex, { utxoCount: 0, coin: '0' });

describe('plannedDestinationIndexes', () => {
  describe('preserve', () => {
    it("names every funded row's own landing account", () => {
      expect(
        plannedDestinationIndexes({
          accountMapping: [row(0, 0), row(1, 1), row(2, 2)],
          migrationMode: 'preserve',
        }),
      ).toEqual([0, 1, 2]);
    });

    it('leaves out rows that will not be migrated', () => {
      expect(
        plannedDestinationIndexes({
          accountMapping: [rewardsOnly(0, 0), row(1, 1)],
          migrationMode: 'preserve',
        }),
      ).toEqual([1]);
    });
  });

  describe('consolidate', () => {
    it('names exactly one account', () => {
      expect(
        plannedDestinationIndexes({
          accountMapping: [row(0, 0), row(1, 1), row(2, 2)],
          migrationMode: 'consolidate',
        }),
      ).toEqual([0]);
    });

    /**
     * The rule that carries the money, and the one a reverted call site would
     * silently break: row 0 is the plan's unprobed guess when it holds no
     * spendable balance, so the swept total would land in an account nothing
     * had checked for on-chain history.
     */
    it('names the landing row, not row 0, when row 0 is not migrated', () => {
      expect(
        plannedDestinationIndexes({
          accountMapping: [rewardsOnly(0, 7), row(1, 3), row(2, 4)],
          migrationMode: 'consolidate',
        }),
      ).toEqual([3]);
    });

    it('names nothing when no row would be migrated', () => {
      expect(
        plannedDestinationIndexes({
          accountMapping: [rewardsOnly(0, 0), rewardsOnly(1, 1)],
          migrationMode: 'consolidate',
        }),
      ).toEqual([]);
    });
  });

  it.each([
    ['an absent mapping', undefined],
    ['an empty mapping', [] as AccountMapping],
  ])('names nothing for %s, whatever the mode', (_label, accountMapping) => {
    for (const migrationMode of ['preserve', 'consolidate', undefined] as const)
      expect(
        plannedDestinationIndexes({ accountMapping, migrationMode }),
      ).toEqual([]);
  });

  /**
   * An unset mode is not preserve. It reaches this helper before the wizard's
   * mode step in at least one path, and defaulting to preserve there would
   * name every row's account as one the sweep pays.
   */
  it('treats an unset mode as consolidate', () => {
    expect(
      plannedDestinationIndexes({
        accountMapping: [row(0, 0), row(1, 1)],
        migrationMode: undefined,
      }),
    ).toEqual([0]);
  });
});
