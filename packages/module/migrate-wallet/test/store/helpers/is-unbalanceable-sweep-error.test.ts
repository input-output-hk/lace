import {
  InputSelectionError,
  InputSelectionFailure,
} from '@lace-contract/cardano-context';
import { describe, expect, it } from 'vitest';

import { isUnbalanceableSweepError } from '../../../src/store/helpers/is-unbalanceable-sweep-error';

describe('isUnbalanceableSweepError', () => {
  it('matches an InputSelectionError from an insufficient balance', () => {
    expect(
      isUnbalanceableSweepError(
        new InputSelectionError(
          InputSelectionFailure.BalanceInsufficient,
          'insufficient',
        ),
      ),
    ).toBe(true);
  });

  it('matches an InputSelectionError from a depleted UTxO pool (min-ADA change)', () => {
    expect(
      isUnbalanceableSweepError(
        new InputSelectionError(
          InputSelectionFailure.UtxoFullyDepleted,
          'depleted',
        ),
      ),
    ).toBe(true);
  });

  it('does not match a no-input builder error (a bug, stays retryable)', () => {
    expect(
      isUnbalanceableSweepError(new Error('No available UTXOs to select from')),
    ).toBe(false);
  });

  it('does not match a min-ADA-change assertion (a bug, stays retryable)', () => {
    expect(
      isUnbalanceableSweepError(
        new Error('Change output is below the minimum UTxO value'),
      ),
    ).toBe(false);
  });

  it('does not match a non-error value', () => {
    expect(isUnbalanceableSweepError(undefined)).toBe(false);
    expect(isUnbalanceableSweepError('boom')).toBe(false);
  });
});
