import { describe, expect, it } from 'vitest';

import {
  governanceCenterActions,
  governanceCenterReducers,
  governanceCenterSelectors,
} from '../../src/store/slice';

import type { DRepSummary } from '@lace-contract/cardano-context';

const testDRep: DRepSummary = {
  drepId: 'drep1test' as DRepSummary['drepId'],
  cip105DrepId: 'drep1testcip105' as DRepSummary['cip105DrepId'],
  hex: '227bdef7aaf3c925e97ca42d36f119b0469a12cca4a17ecfefc6900350',
  isActive: true,
  retired: false,
  expired: false,
  amount: '1000000',
  hasScript: false,
};

describe('governance center slice', () => {
  it('should have correct initial state for voteDelegationFlow', () => {
    const reducer = governanceCenterReducers.voteDelegationFlow;
    const state = reducer(undefined, { type: 'unknown' });
    expect(state).toEqual({ status: 'Idle' });
  });

  it('should have correct initial state for governanceCenterConfig', () => {
    const reducer = governanceCenterReducers.governanceCenterConfig;
    const state = reducer(undefined, { type: 'unknown' });
    expect(state).toEqual({ disclaimerAcknowledged: false });
  });

  it('should set disclaimerAcknowledged to true on acknowledgeDisclaimer', () => {
    const reducer = governanceCenterReducers.governanceCenterConfig;
    const state = reducer(
      { disclaimerAcknowledged: false },
      {
        type: 'governanceCenterConfig/acknowledgeDisclaimer',
      },
    );
    expect(state.disclaimerAcknowledged).toBe(true);
  });

  describe('dRepsList', () => {
    const reducer = governanceCenterReducers.dRepsList;

    it('should have correct initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual({
        dReps: [],
        isLoading: false,
        fetchedAt: null,
        error: false,
      });
    });

    it('sets isLoading and clears error on fetchDRepsRequested', () => {
      const state = reducer(
        { dReps: [], isLoading: false, fetchedAt: null, error: true },
        governanceCenterActions.dRepsList.fetchDRepsRequested(),
      );
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(false);
    });

    it('stores dReps, clears isLoading and error, and records fetchedAt on fetchDRepsSucceeded', () => {
      const before = Date.now();
      const state = reducer(
        { dReps: [], isLoading: true, fetchedAt: null, error: true },
        governanceCenterActions.dRepsList.fetchDRepsSucceeded({
          dReps: [testDRep],
        }),
      );
      const after = Date.now();
      expect(state.dReps).toEqual([testDRep]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(false);
      expect(state.fetchedAt).toBeGreaterThanOrEqual(before);
      expect(state.fetchedAt).toBeLessThanOrEqual(after);
    });

    it('clears isLoading and sets error on fetchDRepsFailed', () => {
      const state = reducer(
        { dReps: [], isLoading: true, fetchedAt: null, error: false },
        governanceCenterActions.dRepsList.fetchDRepsFailed(),
      );
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(true);
    });

    it('clears the list, cache timestamp and error on resetDReps', () => {
      const state = reducer(
        { dReps: [testDRep], isLoading: true, fetchedAt: 123, error: true },
        governanceCenterActions.dRepsList.resetDReps(),
      );
      expect(state).toEqual({
        dReps: [],
        isLoading: false,
        fetchedAt: null,
        error: false,
      });
    });

    describe('selectDRepsHasError', () => {
      const { selectDRepsHasError } = governanceCenterSelectors.dRepsList;

      it('is true after a failed fetch', () => {
        expect(
          selectDRepsHasError({
            dRepsList: {
              dReps: [],
              isLoading: false,
              fetchedAt: null,
              error: true,
            },
          } as never),
        ).toBe(true);
      });

      it('is false otherwise', () => {
        expect(
          selectDRepsHasError({
            dRepsList: {
              dReps: [],
              isLoading: false,
              fetchedAt: null,
              error: false,
            },
          } as never),
        ).toBe(false);
      });
    });

    describe('selectDRepsIsInitiallyLoading', () => {
      const { selectDRepsIsInitiallyLoading } =
        governanceCenterSelectors.dRepsList;

      it('is true when loading with no prior fetch', () => {
        expect(
          selectDRepsIsInitiallyLoading({
            dRepsList: { dReps: [], isLoading: true, fetchedAt: null },
          } as never),
        ).toBe(true);
      });

      it('is false when not loading', () => {
        expect(
          selectDRepsIsInitiallyLoading({
            dRepsList: { dReps: [], isLoading: false, fetchedAt: null },
          } as never),
        ).toBe(false);
      });

      it('is false when loading but data was previously fetched', () => {
        expect(
          selectDRepsIsInitiallyLoading({
            dRepsList: { dReps: [], isLoading: true, fetchedAt: Date.now() },
          } as never),
        ).toBe(false);
      });
    });
  });

  describe('dRepsFilter', () => {
    const reducer = governanceCenterReducers.dRepsFilter;

    it('should have correct initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual({ status: 'all', sortBy: 'votingPower' });
    });

    it('updates status on setDRepStatus', () => {
      const state = reducer(
        { status: 'all', sortBy: 'votingPower' },
        governanceCenterActions.dRepsFilter.setDRepStatus({
          status: 'inactive',
        }),
      );
      expect(state.status).toBe('inactive');
    });

    it('updates sortBy on setDRepSortBy', () => {
      const state = reducer(
        { status: 'all', sortBy: 'votingPower' },
        governanceCenterActions.dRepsFilter.setDRepSortBy({
          sortBy: 'status',
        }),
      );
      expect(state.sortBy).toBe('status');
    });

    describe('selectors', () => {
      const { selectDRepStatus, selectDRepSortBy } =
        governanceCenterSelectors.dRepsFilter;
      const rootState = {
        dRepsFilter: { status: 'active', sortBy: 'status' },
      } as never;

      it('selectDRepStatus returns the current status', () => {
        expect(selectDRepStatus(rootState)).toBe('active');
      });

      it('selectDRepSortBy returns the current sort', () => {
        expect(selectDRepSortBy(rootState)).toBe('status');
      });
    });
  });

  describe('promotedDReps', () => {
    const reducer = governanceCenterReducers.promotedDReps;

    it('has the correct initial state', () => {
      expect(reducer(undefined, { type: 'unknown' })).toEqual({
        config: {},
        activePromoted: [],
      });
    });

    it('stores the config on setConfig', () => {
      const config = { mainnet: [{ id: 'drep1abc' }] };
      const state = reducer(
        undefined,
        governanceCenterActions.promotedDReps.setConfig(config),
      );
      expect(state.config).toEqual(config);
    });

    it('stores the active list on setActivePromoted', () => {
      const promoted = [{ id: 'drep1abc' }];
      const state = reducer(
        undefined,
        governanceCenterActions.promotedDReps.setActivePromoted({ promoted }),
      );
      expect(state.activePromoted).toEqual(promoted);
    });

    it('selectors fall back to shared empties for undefined state', () => {
      const { selectPromotedConfig, selectActivePromoted } =
        governanceCenterSelectors.promotedDReps;
      expect(selectPromotedConfig(undefined)).toEqual({});
      expect(selectActivePromoted(undefined)).toEqual([]);
    });

    it('selectors read real values from populated root state', () => {
      const { selectPromotedConfig, selectActivePromoted } =
        governanceCenterSelectors.promotedDReps;
      const config = { mainnet: [{ id: 'drep1abc' }] };
      const activePromoted = [{ id: 'drep1abc' }];
      const rootState = {
        promotedDReps: { config, activePromoted },
      } as never;
      expect(selectPromotedConfig(rootState)).toBe(config);
      expect(selectActivePromoted(rootState)).toBe(activePromoted);
    });
  });
});
