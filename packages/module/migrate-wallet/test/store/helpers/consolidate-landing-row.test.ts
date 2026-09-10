import { describe, expect, it } from 'vitest';

import { consolidateLandingRow } from '../../../src/store/helpers/consolidate-landing-row';

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

describe('consolidateLandingRow', () => {
  it('takes the first row when it is funded', () => {
    expect(consolidateLandingRow([row(0, 0), row(1, 1)])).toEqual({
      position: 0,
      destinationAccountIndex: 0,
    });
  });

  /**
   * The defect this exists for. The freshness probe resolves indexes for
   * FUNDED rows only — a rewards-only row is never migrated, so no account is
   * created for it and it keeps whatever index the plan guessed, unprobed.
   * Consolidate read row 0 regardless, so a source whose lowest account held
   * only rewards sent the entire swept balance into a destination account that
   * nothing had checked for on-chain history: the fresh-destination guarantee
   * (FR-13) the review screen promises, silently broken.
   *
   * Index 1 here is the funded row's PROBED index; index 0 is the guess.
   */
  it('skips a rewards-only first row, whose index was never probed', () => {
    // Position matters as much as the index: the probe rewrites the row the
    // sweep lands on, so both sides must name the same one.
    expect(consolidateLandingRow([rewardsOnly(0, 0), row(1, 1)])).toEqual({
      position: 1,
      destinationAccountIndex: 1,
    });
  });

  it('skips a run of unmigratable rows', () => {
    expect(
      consolidateLandingRow([rewardsOnly(0, 0), rewardsOnly(1, 1), row(2, 2)]),
    ).toEqual({ position: 2, destinationAccountIndex: 2 });
  });

  // A row the per-account dry build refused cannot fund its own transaction,
  // so it is not migrated either and its index is equally unprobed.
  it('skips a row that cannot fund its own transaction', () => {
    expect(
      consolidateLandingRow([
        { ...row(0, 0), canFundOwnTransaction: false },
        row(1, 1),
      ]),
    ).toEqual({ position: 1, destinationAccountIndex: 1 });
  });

  // Nothing to land: the caller falls back to the account the user picked,
  // which is the same behaviour as having no plan at all. Discovery refuses a
  // source with nothing to sweep long before this.
  it('names no row when none is migratable', () => {
    expect(
      consolidateLandingRow([rewardsOnly(0, 0), rewardsOnly(1, 1)]),
    ).toBeUndefined();
    expect(consolidateLandingRow([])).toBeUndefined();
  });
});
