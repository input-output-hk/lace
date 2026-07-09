import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMidnightDapps } from '../../src/static/dataSource';
import { loadDapps } from '../../src/store/side-effects';
import { dappExplorerActions } from '../../src/store/slice';

import type { CardanoCubeProvider } from '../../src/store/dependencies';
import type {
  CardanoCubeCategory,
  CardanoCubeProject,
  DappItem,
} from '../../src/types';

const TEST_NOW_MS = 1_700_000_000_000;

const actions = dappExplorerActions;

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;

const makeProject = (slug: string): CardanoCubeProject =>
  ({
    name: `Project ${slug}`,
    slug,
    short_description: 'desc',
    logos: { small: null, medium: null, large: null },
    rating: { vote_count: 0, average_rating: null, star_count: 0 },
    website: 'https://example.com',
    active_status: 'active',
    scam_status: 'clean',
    updated_at: '2025-01-01T00:00:00.000Z',
    main_category: {
      id: 1,
      parent_id: null,
      name: 'DeFi',
      slug: 'defi',
      projects_count: 1,
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    additional_categories: [],
  } as unknown as CardanoCubeProject);

const projectToDappItem = (
  project: CardanoCubeProject,
  chain: string,
): DappItem => ({
  slug: project.slug,
  name: project.name,
  description: project.short_description ?? null,
  logoUrl:
    project.logos.medium ?? project.logos.small ?? project.logos.large ?? null,
  website: project.website ?? null,
  active_status: project.active_status,
  scam_status: project.scam_status,
  rating: project.rating,
  chain,
  categories: project.main_category ? [project.main_category.slug] : [],
  socialLinks: [],
  updated_at: project.updated_at,
});

const projectA = makeProject('alpha');
const projectB = makeProject('bravo');

const midnightDapps = getMidnightDapps().map(p =>
  projectToDappItem(p as unknown as CardanoCubeProject, 'Midnight'),
);

const categories: CardanoCubeCategory[] = [
  {
    id: 1,
    parent_id: null,
    name: 'DeFi',
    slug: 'defi',
    projects_count: 1,
    updated_at: '2025-01-01T00:00:00.000Z',
  } as unknown as CardanoCubeCategory,
];

const makeProvider = (
  overrides: Partial<CardanoCubeProvider> = {},
): CardanoCubeProvider => ({
  fetchProjectPage: vi
    .fn()
    .mockReturnValue(of({ items: [projectA, projectB], hasMore: false })),
  fetchCategories: vi.fn().mockReturnValue(of(categories)),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW_MS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadDapps side effect', () => {
  describe('cold boot — no cache', () => {
    it('runs progressive fetch: loading → clear → append pages → success → categories → timestamp', () => {
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const provider = makeProvider();
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', { a: null }),
              getDappList$: hot('a', { a: [] as DappItem[] }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abcdefgh)', {
              a: actions.dappExplorer.setFetchStatus('loading'),
              b: actions.dappExplorer.setExplorerList([]),
              c: actions.dappExplorer.appendToExplorerList([
                projectToDappItem(projectA, 'Cardano'),
                projectToDappItem(projectB, 'Cardano'),
              ]),
              d: actions.dappExplorer.setFetchStatus('success'),
              e: actions.dappExplorer.appendToExplorerList(midnightDapps),
              f: actions.dappExplorer.setFetchStatus('success'),
              g: actions.dappExplorer.setAvailableCategories([
                'show all',
                'defi',
              ]),
              h: actions.dappExplorer.setLastFetchedAt(TEST_NOW_MS),
            });
          },
        };
      });
    });

    it('emits setLastFetchedAt with current time AFTER categories succeed', () => {
      const emitted: { type: string; payload?: unknown }[] = [];
      testSideEffect(loadDapps, ({ hot, flush }) => {
        const provider = makeProvider();
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', { a: null }),
              getDappList$: hot('a', { a: [] as DappItem[] }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(a => emitted.push(a));
            flush();
            const types = emitted.map(a => a.type);
            const tsIndex = types.indexOf('dappExplorer/setLastFetchedAt');
            const catIndex = types.indexOf(
              'dappExplorer/setAvailableCategories',
            );
            expect(catIndex).toBeGreaterThanOrEqual(0);
            expect(tsIndex).toBeGreaterThan(catIndex);
            const stamp = emitted[tsIndex] as { payload: number };
            expect(stamp.payload).toBe(TEST_NOW_MS);
          },
        };
      });
    });
  });

  describe('warm boot — cache fresh (≤ 24h)', () => {
    it('emits only setFetchStatus("success"), no fetch', () => {
      const cardanoCubeProvider = makeProvider();
      testSideEffect(loadDapps, ({ hot, expectObservable }) => ({
        actionObservables: {
          dappExplorer: { loadDappsRequested$: hot('-') },
        },
        stateObservables: {
          dappExplorer: {
            getLastFetchedAt$: hot('a', {
              a: TEST_NOW_MS - ONE_HOUR_MS,
            }),
            getDappList$: hot('a', {
              a: [projectToDappItem(projectA, 'Cardano')],
            }),
          },
        },
        dependencies: { actions, cardanoCubeProvider },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.dappExplorer.setFetchStatus('success'),
          });
        },
      }));
      expect(cardanoCubeProvider.fetchProjectPage).not.toHaveBeenCalled();
      expect(cardanoCubeProvider.fetchCategories).not.toHaveBeenCalled();
    });
  });

  describe('warm boot — cache stale (> 24h)', () => {
    it('reveals cached list, fetches in background, flashes skeleton then swaps', () => {
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const provider = makeProvider();
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', {
                a: TEST_NOW_MS - TWENTY_FIVE_HOURS_MS,
              }),
              getDappList$: hot('a', {
                a: [projectToDappItem(projectA, 'Cardano')],
              }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab) 296ms (cdef)', {
              a: actions.dappExplorer.setFetchStatus('success'),
              b: actions.dappExplorer.setFetchStatus('loading'),
              c: actions.dappExplorer.setExplorerList([
                projectToDappItem(projectA, 'Cardano'),
                projectToDappItem(projectB, 'Cardano'),
                ...midnightDapps,
              ]),
              d: actions.dappExplorer.setFetchStatus('success'),
              e: actions.dappExplorer.setAvailableCategories([
                'show all',
                'defi',
              ]),
              f: actions.dappExplorer.setLastFetchedAt(TEST_NOW_MS),
            });
          },
        };
      });
    });
  });

  describe('retry tap', () => {
    it('always runs a progressive fetch regardless of cache age', () => {
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const provider = makeProvider();
        return {
          actionObservables: {
            dappExplorer: {
              loadDappsRequested$: hot('-a', {
                a: actions.dappExplorer.loadDappsRequested(),
              }),
            },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', {
                a: TEST_NOW_MS - ONE_HOUR_MS,
              }),
              getDappList$: hot('a', {
                a: [projectToDappItem(projectA, 'Cardano')],
              }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a(bcdefghi)', {
              a: actions.dappExplorer.setFetchStatus('success'),
              b: actions.dappExplorer.setFetchStatus('loading'),
              c: actions.dappExplorer.setExplorerList([]),
              d: actions.dappExplorer.appendToExplorerList([
                projectToDappItem(projectA, 'Cardano'),
                projectToDappItem(projectB, 'Cardano'),
              ]),
              e: actions.dappExplorer.setFetchStatus('success'),
              f: actions.dappExplorer.appendToExplorerList(midnightDapps),
              g: actions.dappExplorer.setFetchStatus('success'),
              h: actions.dappExplorer.setAvailableCategories([
                'show all',
                'defi',
              ]),
              i: actions.dappExplorer.setLastFetchedAt(TEST_NOW_MS),
            });
          },
        };
      });
    });
  });

  describe('failure handling', () => {
    it('emits setFetchStatus("error") when pages fail (no cache)', () => {
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const provider = makeProvider({
          fetchProjectPage: vi
            .fn()
            .mockReturnValue(throwError(() => new Error('network down'))),
        });
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', { a: null }),
              getDappList$: hot('a', { a: [] as DappItem[] }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab) 20996ms c', {
              a: actions.dappExplorer.setFetchStatus('loading'),
              b: actions.dappExplorer.setExplorerList([]),
              c: actions.dappExplorer.setFetchStatus('error'),
            });
          },
        };
      });
    });

    it('emits setFetchStatus("error") and does NOT persist timestamp when categories fail', () => {
      const emitted: { type: string; payload?: unknown }[] = [];
      testSideEffect(loadDapps, ({ hot, flush }) => {
        const provider = makeProvider({
          fetchCategories: vi
            .fn()
            .mockReturnValue(throwError(() => new Error('categories down'))),
        });
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', { a: null }),
              getDappList$: hot('a', { a: [] as DappItem[] }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(a => emitted.push(a));
            flush();
            const types = emitted.map(a => a.type);
            expect(types).toContain('dappExplorer/setFetchStatus');
            expect(types).not.toContain('dappExplorer/setLastFetchedAt');
            const last = emitted.at(-1) as { type: string; payload: unknown };
            expect(last.type).toBe('dappExplorer/setFetchStatus');
            expect(last.payload).toBe('error');
          },
        };
      });
    });

    it('emits setFetchStatus("error") when stale-cache refresh fails', () => {
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const provider = makeProvider({
          fetchProjectPage: vi
            .fn()
            .mockReturnValue(throwError(() => new Error('network down'))),
        });
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', {
                a: TEST_NOW_MS - TWENTY_FIVE_HOURS_MS,
              }),
              getDappList$: hot('a', {
                a: [projectToDappItem(projectA, 'Cardano')],
              }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a 20999ms b', {
              a: actions.dappExplorer.setFetchStatus('success'),
              b: actions.dappExplorer.setFetchStatus('error'),
            });
          },
        };
      });
    });
  });

  describe('multi-page pagination', () => {
    it('appends each page as it arrives', () => {
      const projectC = makeProject('charlie');
      testSideEffect(loadDapps, ({ hot, expectObservable }) => {
        const fetchPage = vi
          .fn()
          .mockReturnValueOnce(of({ items: [projectA], hasMore: true }))
          .mockReturnValueOnce(of({ items: [projectB], hasMore: true }))
          .mockReturnValueOnce(of({ items: [projectC], hasMore: false }));
        const provider = makeProvider({ fetchProjectPage: fetchPage });
        return {
          actionObservables: {
            dappExplorer: { loadDappsRequested$: hot('-') },
          },
          stateObservables: {
            dappExplorer: {
              getLastFetchedAt$: hot('a', { a: null }),
              getDappList$: hot('a', { a: [] as DappItem[] }),
            },
          },
          dependencies: {
            actions,
            cardanoCubeProvider: provider,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abcdefghijkl)', {
              a: actions.dappExplorer.setFetchStatus('loading'),
              b: actions.dappExplorer.setExplorerList([]),
              c: actions.dappExplorer.appendToExplorerList([
                projectToDappItem(projectA, 'Cardano'),
              ]),
              d: actions.dappExplorer.setFetchStatus('success'),
              e: actions.dappExplorer.appendToExplorerList([
                projectToDappItem(projectB, 'Cardano'),
              ]),
              f: actions.dappExplorer.setFetchStatus('success'),
              g: actions.dappExplorer.appendToExplorerList([
                projectToDappItem(projectC, 'Cardano'),
              ]),
              h: actions.dappExplorer.setFetchStatus('success'),
              i: actions.dappExplorer.appendToExplorerList(midnightDapps),
              j: actions.dappExplorer.setFetchStatus('success'),
              k: actions.dappExplorer.setAvailableCategories([
                'show all',
                'defi',
              ]),
              l: actions.dappExplorer.setLastFetchedAt(TEST_NOW_MS),
            });
          },
        };
      });
    });
  });
});
