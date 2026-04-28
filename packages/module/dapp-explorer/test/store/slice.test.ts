import { describe, expect, it } from 'vitest';

import { dappExplorerActions as actions } from '../../src/store/slice';
import { dappCenterReducers } from '../../src/store/slice';

import type { DappExplorerState } from '../../src/store/slice';

const baseState: DappExplorerState = {
  selectedDapp: null,
  search: {
    category: 'show all',
    chain: undefined,
    searchValue: '',
  },
  categories: [],
  dappList: [],
  status: 'loading',
  ukFcaDisclaimerAcknowledged: false,
};

describe('dappExplorer slice', () => {
  describe('reducers', () => {
    describe('acknowledgeUkFcaDisclaimer', () => {
      it('sets ukFcaDisclaimerAcknowledged to true', () => {
        const state = dappCenterReducers.dappExplorer(
          baseState,
          actions.dappExplorer.acknowledgeUkFcaDisclaimer(),
        );
        expect(state.ukFcaDisclaimerAcknowledged).toBe(true);
      });

      it('leaves other state untouched', () => {
        const state = dappCenterReducers.dappExplorer(
          baseState,
          actions.dappExplorer.acknowledgeUkFcaDisclaimer(),
        );
        expect(state.selectedDapp).toBeNull();
        expect(state.dappList).toEqual([]);
        expect(state.status).toBe('loading');
      });
    });
  });

  describe('selectors', () => {
    describe('selectUkFcaDisclaimerAcknowledged', () => {
      it('returns false from initial state', () => {
        expect(baseState.ukFcaDisclaimerAcknowledged).toBe(false);
      });

      it('returns true after acknowledgeUkFcaDisclaimer is dispatched', () => {
        const state = dappCenterReducers.dappExplorer(
          baseState,
          actions.dappExplorer.acknowledgeUkFcaDisclaimer(),
        );
        expect(state.ukFcaDisclaimerAcknowledged).toBe(true);
      });
    });
  });
});
