import { describe, expect, it } from 'vitest';

import { proofActivitySlice } from '../../src/store/proof-activity-slice';

import type { ProofActivity } from '../../src/types';

const { reducer, actions } = proofActivitySlice;
describe('proof activity state', () => {
  it('dismisses only the chosen terminal result, retaining running work and other failures', () => {
    const state: ProofActivity[] = [
      { id: 'running', number: 1, kind: 'proof', status: 'running' },
      { id: 'failed', number: 2, kind: 'proof', status: 'failed' },
      { id: 'succeeded', number: 3, kind: 'transaction', status: 'succeeded' },
    ];
    const loaded = reducer(undefined, actions.proofActivitiesUpdated(state));
    expect(
      reducer(loaded, actions.proofActivityDismissRequested('running')),
    ).toEqual(state);
    expect(
      reducer(loaded, actions.proofActivityDismissRequested('succeeded')),
    ).toEqual(state.slice(0, 2));
    expect(
      reducer(loaded, actions.proofActivityDismissRequested('failed')),
    ).toEqual([state[0], state[2]]);
  });
});
