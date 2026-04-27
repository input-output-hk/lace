import { describe, expect, it } from 'vitest';

import { stakingCenterReducers } from '../../src/store/slice';

describe('staking center slice', () => {
  it('should have correct initial state', () => {
    const reducer = stakingCenterReducers.delegationFlow;
    const state = reducer(undefined, { type: 'unknown' });
    expect(state).toEqual({ status: 'Idle' });
  });
});
