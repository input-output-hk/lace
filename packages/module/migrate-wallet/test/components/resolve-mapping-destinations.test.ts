import { describe, expect, it } from 'vitest';

import { resolveMappingDestinations } from '../../src/components/resolve-mapping-destinations';

import type { AccountMapping } from '../../src/store/slice';

const row = (
  sourceAccountIndex: number,
  destinationAccountIndex: number,
): AccountMapping[number] => ({
  sourceAccountIndex,
  destinationAccountIndex,
  coin: '1000000',
  assetCount: 0,
  utxoCount: 1,
});

const mapping: AccountMapping = [row(0, 2), row(1, 3), row(2, 4)];

describe('resolveMappingDestinations', () => {
  // The contradiction this fixes: the card's lead line said the accounts are
  // combined into one destination while its rows named three different ones.
  it('points every row at the first destination when consolidating', () => {
    expect(
      resolveMappingDestinations(mapping, 'consolidate').map(
        entry => entry.destinationAccountIndex,
      ),
    ).toEqual([2, 2, 2]);
  });

  it('keeps each row on its own destination when preserving', () => {
    expect(resolveMappingDestinations(mapping, 'preserve')).toBe(mapping);
  });

  it('leaves the plan alone before a mode is chosen', () => {
    expect(resolveMappingDestinations(mapping, undefined)).toBe(mapping);
  });

  it('handles an empty plan', () => {
    expect(resolveMappingDestinations([], 'consolidate')).toEqual([]);
  });
});
