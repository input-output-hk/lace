import { describe, expect, it } from 'vitest';

import {
  dappCenterReducers,
  dappExplorerActions as actions,
  dappExplorerSelectors,
} from '../../src/store/slice';

import type { DappExplorerState } from '../../src/store/slice';
import type { DappItem } from '../../src/types';

const makeDapp = (
  slug: string,
  overrides: Partial<DappItem> = {},
): DappItem => ({
  slug,
  name: `Dapp ${slug}`,
  description: 'A test dapp',
  logoUrl: null,
  website: null,
  active_status: 'active',
  scam_status: 'clean',
  rating: { vote_count: 0, average_rating: null, star_count: 0 },
  chain: 'cardano',
  categories: ['defi'],
  socialLinks: [],
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

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
  lastFetchedAt: null,
};

const reduce = (
  state: DappExplorerState,
  action: { type: string; payload?: unknown },
): DappExplorerState => dappCenterReducers.dappExplorer(state, action);

const withDappExplorer = (state: DappExplorerState) => ({
  dappExplorer: state,
});

describe('dappExplorer slice', () => {
  describe('reducers', () => {
    describe('setExplorerList', () => {
      it('replaces dappList with the payload', () => {
        const next = reduce(
          { ...baseState, dappList: [makeDapp('a')] },
          actions.dappExplorer.setExplorerList([makeDapp('b'), makeDapp('c')]),
        );
        expect(next.dappList.map(d => d.slug)).toEqual(['b', 'c']);
      });

      it('accepts an empty list', () => {
        const next = reduce(
          { ...baseState, dappList: [makeDapp('a')] },
          actions.dappExplorer.setExplorerList([]),
        );
        expect(next.dappList).toEqual([]);
      });

      it('does not alter status', () => {
        const next = reduce(
          { ...baseState, status: 'loading' },
          actions.dappExplorer.setExplorerList([makeDapp('a')]),
        );
        expect(next.status).toBe('loading');
      });
    });

    describe('appendToExplorerList', () => {
      it('appends new items by slug', () => {
        const next = reduce(
          { ...baseState, dappList: [makeDapp('a')] },
          actions.dappExplorer.appendToExplorerList([
            makeDapp('b'),
            makeDapp('c'),
          ]),
        );
        expect(next.dappList.map(d => d.slug)).toEqual(['a', 'b', 'c']);
      });

      it('skips duplicates by slug, keeping the original entry', () => {
        const next = reduce(
          { ...baseState, dappList: [makeDapp('a')] },
          actions.dappExplorer.appendToExplorerList([
            makeDapp('a', { name: 'overridden' }),
            makeDapp('b'),
          ]),
        );
        expect(next.dappList.map(d => d.slug)).toEqual(['a', 'b']);
        expect(next.dappList[0].name).toBe('Dapp a');
      });

      it('does not alter status', () => {
        const next = reduce(
          { ...baseState, status: 'loading' },
          actions.dappExplorer.appendToExplorerList([makeDapp('a')]),
        );
        expect(next.status).toBe('loading');
      });
    });

    describe('setAvailableCategories', () => {
      it('replaces categories', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.setAvailableCategories(['defi', 'games']),
        );
        expect(next.categories).toEqual(['defi', 'games']);
      });
    });

    describe('setSearchParams', () => {
      it('partially updates search params', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.setSearchParams({ searchValue: 'min' }),
        );
        expect(next.search).toEqual({
          category: 'show all',
          chain: undefined,
          searchValue: 'min',
        });
      });

      it('overrides only the supplied keys', () => {
        const previous = reduce(
          baseState,
          actions.dappExplorer.setSearchParams({
            category: 'defi',
            chain: 'Bitcoin',
          }),
        );
        const next = reduce(
          previous,
          actions.dappExplorer.setSearchParams({ searchValue: 'sundae' }),
        );
        expect(next.search).toEqual({
          category: 'defi',
          chain: 'Bitcoin',
          searchValue: 'sundae',
        });
      });
    });

    describe('setSearchChain', () => {
      it('sets the chain on search', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.setSearchChain('Cardano'),
        );
        expect(next.search.chain).toBe('Cardano');
      });
    });

    describe('setFetchStatus', () => {
      it.each(['idle', 'loading', 'success', 'error'] as const)(
        'sets status to %s',
        status => {
          const next = reduce(
            baseState,
            actions.dappExplorer.setFetchStatus(status),
          );
          expect(next.status).toBe(status);
        },
      );
    });

    describe('resetSearchParams', () => {
      it('restores initial search', () => {
        const dirtied = reduce(
          baseState,
          actions.dappExplorer.setSearchParams({
            category: 'defi',
            chain: 'Bitcoin',
            searchValue: 'min',
          }),
        );
        const next = reduce(dirtied, actions.dappExplorer.resetSearchParams());
        expect(next.search).toEqual({
          category: 'show all',
          chain: undefined,
          searchValue: '',
        });
      });
    });

    describe('acknowledgeUkFcaDisclaimer', () => {
      it('sets the flag to true', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.acknowledgeUkFcaDisclaimer(),
        );
        expect(next.ukFcaDisclaimerAcknowledged).toBe(true);
      });

      it('leaves other state untouched', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.acknowledgeUkFcaDisclaimer(),
        );
        expect(next.selectedDapp).toBeNull();
        expect(next.dappList).toEqual([]);
        expect(next.status).toBe('loading');
      });
    });

    describe('setLastFetchedAt', () => {
      it('stores the timestamp', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.setLastFetchedAt(1700000000000),
        );
        expect(next.lastFetchedAt).toBe(1700000000000);
      });
    });

    describe('loadDappsRequested', () => {
      it('is a no-op reducer', () => {
        const next = reduce(
          baseState,
          actions.dappExplorer.loadDappsRequested(),
        );
        expect(next).toEqual(baseState);
      });
    });
  });

  describe('selectors', () => {
    it('getAvailableDappCategories returns categories', () => {
      const state = withDappExplorer({ ...baseState, categories: ['defi'] });
      expect(
        dappExplorerSelectors.dappExplorer.getAvailableDappCategories(state),
      ).toEqual(['defi']);
    });

    describe('getDappById', () => {
      it('finds a dapp by slug', () => {
        const dapp = makeDapp('minswap');
        const state = withDappExplorer({ ...baseState, dappList: [dapp] });
        expect(
          dappExplorerSelectors.dappExplorer.getDappById(state, 'minswap'),
        ).toEqual(dapp);
      });

      it('returns undefined for unknown slug', () => {
        const state = withDappExplorer(baseState);
        expect(
          dappExplorerSelectors.dappExplorer.getDappById(state, 'nope'),
        ).toBeUndefined();
      });
    });

    it('getSearchParams returns the current search', () => {
      const state = withDappExplorer({
        ...baseState,
        search: { category: 'defi', chain: 'Cardano', searchValue: 'sun' },
      });
      expect(dappExplorerSelectors.dappExplorer.getSearchParams(state)).toEqual(
        { category: 'defi', chain: 'Cardano', searchValue: 'sun' },
      );
    });

    it('getSelectedDapp returns the selected dapp', () => {
      const dapp = makeDapp('minswap');
      const state = withDappExplorer({ ...baseState, selectedDapp: dapp });
      expect(dappExplorerSelectors.dappExplorer.getSelectedDapp(state)).toEqual(
        dapp,
      );
    });

    it('getFetchStatus returns status', () => {
      const state = withDappExplorer({ ...baseState, status: 'error' });
      expect(dappExplorerSelectors.dappExplorer.getFetchStatus(state)).toBe(
        'error',
      );
    });

    it('getDappList returns the list', () => {
      const list = [makeDapp('a'), makeDapp('b')];
      const state = withDappExplorer({ ...baseState, dappList: list });
      expect(dappExplorerSelectors.dappExplorer.getDappList(state)).toEqual(
        list,
      );
    });

    it('getLastFetchedAt returns the timestamp', () => {
      const state = withDappExplorer({ ...baseState, lastFetchedAt: 42 });
      expect(dappExplorerSelectors.dappExplorer.getLastFetchedAt(state)).toBe(
        42,
      );
    });

    it('selectUkFcaDisclaimerAcknowledged returns the flag', () => {
      const state = withDappExplorer({
        ...baseState,
        ukFcaDisclaimerAcknowledged: true,
      });
      expect(
        dappExplorerSelectors.dappExplorer.selectUkFcaDisclaimerAcknowledged(
          state,
        ),
      ).toBe(true);
    });
  });

  describe('initial state', () => {
    it('starts with status="loading"', () => {
      const state = reduce(undefined as unknown as DappExplorerState, {
        type: '@@INIT',
      });
      expect(state.status).toBe('loading');
    });

    it('starts with empty dappList', () => {
      const state = reduce(undefined as unknown as DappExplorerState, {
        type: '@@INIT',
      });
      expect(state.dappList).toEqual([]);
    });

    it('starts with lastFetchedAt=null', () => {
      const state = reduce(undefined as unknown as DappExplorerState, {
        type: '@@INIT',
      });
      expect(state.lastFetchedAt).toBeNull();
    });
  });
});
