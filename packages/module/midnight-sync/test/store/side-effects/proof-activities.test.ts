import { midnightContextActions } from '@lace-contract/midnight-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import {
  dismissProofActivity,
  watchProofActivities,
} from '../../../src/store/side-effects/proof-activities';

const actions = { ...midnightContextActions };
describe('proof activity bridge', () => {
  it('forwards background snapshots to UI state', () => {
    testSideEffect(watchProofActivities, ({ hot, expectObservable }) => ({
      dependencies: { actions, wasmProofActivities$: hot('a', { a: [] }) },
      assertion: result => {
        expectObservable(result).toBe('a', {
          a: actions.midnightContext.proofActivitiesUpdated([]),
        });
      },
    }));
  });
  it('removes dismissed results from the background registry', () => {
    const dismiss = vi.fn();
    testSideEffect(dismissProofActivity, ({ hot, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          proofActivityDismissRequested$: hot('a|', {
            a: actions.midnightContext.proofActivityDismissRequested('job'),
          }),
        },
      },
      dependencies: { actions, dismissWasmProofActivity: dismiss },
      assertion: result => {
        expectObservable(result).toBe('-|');
      },
    }));
    expect(dismiss).toHaveBeenCalledWith('job');
  });
});
