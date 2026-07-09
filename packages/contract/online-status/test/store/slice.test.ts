import { describe, expect, it } from 'vitest';

import {
  onlineStatusActions as actions,
  onlineStatusSelectors,
} from '../../src/index';
import { onlineStatusReducers } from '../../src/store/slice';

import type { OnlineStatusSliceState } from '../../src/store/slice';

describe('onlineStatus slice', () => {
  describe('reducers', () => {
    describe('setOffline', () => {
      it('sets isOffline to true', () => {
        const state: OnlineStatusSliceState = { isOffline: false };
        const next = onlineStatusReducers.onlineStatus(
          state,
          actions.onlineStatus.setOffline(true),
        );
        expect(next.isOffline).toBe(true);
      });

      it('sets isOffline to false', () => {
        const state: OnlineStatusSliceState = { isOffline: true };
        const next = onlineStatusReducers.onlineStatus(
          state,
          actions.onlineStatus.setOffline(false),
        );
        expect(next.isOffline).toBe(false);
      });
    });
  });

  describe('selectors', () => {
    it('selectIsOffline returns the isOffline flag', () => {
      expect(
        onlineStatusSelectors.onlineStatus.selectIsOffline({
          onlineStatus: { isOffline: true },
        }),
      ).toBe(true);
      expect(
        onlineStatusSelectors.onlineStatus.selectIsOffline({
          onlineStatus: { isOffline: false },
        }),
      ).toBe(false);
    });
  });
});
