import { beforeEach, describe, expect, it } from 'vitest';

import { analyticsActions as actions } from '../../src';
import { analyticsReducers } from '../../src/store/slice';

import type { AnalyticsSliceState } from '../../src';

describe('analytics slice', () => {
  let initialState: AnalyticsSliceState;

  beforeEach(() => {
    initialState = analyticsReducers.analytics(undefined, {
      type: 'doesnt-matter',
    });
  });

  describe('reducers', () => {
    describe('load', () => {
      it('should load user details into the state', () => {
        const userPayload = {
          id: 'user1',
        };

        const updatedState = analyticsReducers.analytics(
          initialState,
          actions.analytics.load(userPayload),
        );

        expect(updatedState.analytics.user).toEqual(userPayload);
      });
    });
  });
});
