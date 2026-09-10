import { describe, expect, it } from 'vitest';

import { reducers, uiActions, uiSelectors } from '../../src/store/slice';

import type { MobileState } from '../../src/store/slice';

const reduce = (
  action: Parameters<typeof reducers.mobile>[1],
  state?: MobileState,
) => reducers.mobile(state, action);

const initialState = reduce({ type: '@@init' });

const getTokenSort = (state: MobileState) =>
  uiSelectors.ui.getTokenSort({ mobile: state });

describe('mobile slice — token sort preference', () => {
  it('defaults to no explicit sort option, ascending', () => {
    expect(getTokenSort(initialState)).toEqual({ order: 'asc' });
  });

  it('stores the option and order the user picks', () => {
    const state = reduce(
      uiActions.ui.setTokenSort({ option: 'ticker', order: 'desc' }),
    );

    expect(getTokenSort(state)).toEqual({ option: 'ticker', order: 'desc' });
  });

  it('stores an absent option when the user clears the sort', () => {
    const sorted = reduce(
      uiActions.ui.setTokenSort({ option: 'quantity', order: 'desc' }),
    );
    const cleared = reduce(
      uiActions.ui.setTokenSort({ option: undefined, order: 'asc' }),
      sorted,
    );

    expect(getTokenSort(cleared).option).toBeUndefined();
  });

  describe('state persisted before the preference existed', () => {
    const legacyState = {
      ...initialState,
      ui: {
        ...initialState.ui,
        portfolio: {
          selectedToken: null,
          selectedFolderId: null,
          isPortfolioView: true,
        },
      },
    } as MobileState;

    it('falls back to the default preference', () => {
      expect(getTokenSort(legacyState)).toEqual({ order: 'asc' });
    });

    it('returns the same reference on every read', () => {
      expect(getTokenSort(legacyState)).toBe(getTokenSort(legacyState));
    });
  });
});
