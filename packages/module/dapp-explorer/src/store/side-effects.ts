import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  concat,
  defer,
  EMPTY,
  exhaustMap,
  expand,
  map,
  merge,
  mergeMap,
  of,
  reduce,
  take,
  timer,
} from 'rxjs';

import { EXCLUDED_CATEGORY_SLUGS } from '../const';
import { getMidnightDapps } from '../static/dataSource';

import type { SideEffect } from '..';
import type { CardanoCubeProject, DappItem } from '../types';
import type { Observable } from 'rxjs';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const RETRY_CONFIG = {
  initialInterval: 3000,
  maxRetries: 3,
};

const toSocialLinks = (
  project: CardanoCubeProject,
): Array<{ type: string; url: string }> => {
  const fields = [
    'twitter',
    'discord',
    'telegram',
    'github',
    'facebook',
    'reddit',
    'linkedin',
  ] as const;
  return fields.flatMap(key => {
    const url = project[key];
    return url ? [{ type: key, url }] : [];
  });
};

const projectToCategories = (project: CardanoCubeProject): string[] => {
  const cats: string[] = [];
  if (project.main_category) cats.push(project.main_category.slug);
  for (const cat of project.additional_categories ?? []) {
    if (!cats.includes(cat.slug)) cats.push(cat.slug);
  }
  return cats;
};

const toDappItem = (project: CardanoCubeProject, chain: string): DappItem => ({
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
  categories: projectToCategories(project),
  socialLinks: toSocialLinks(project),
  updated_at: project.updated_at,
});

type PageEmission = { items: DappItem[]; hasMore: boolean; page: number };

const streamCardanoPages = (
  fetchPage: (
    page: number,
  ) => Observable<{ items: CardanoCubeProject[]; hasMore: boolean }>,
): Observable<PageEmission> =>
  fetchPage(1).pipe(
    retryBackoff(RETRY_CONFIG),
    map(({ items, hasMore }) => ({
      page: 1,
      items: items.map(p => toDappItem(p, 'Cardano')),
      hasMore,
    })),
    expand(({ page, hasMore }) =>
      hasMore
        ? fetchPage(page + 1).pipe(
            retryBackoff(RETRY_CONFIG),
            map(({ items, hasMore: nextHasMore }) => ({
              page: page + 1,
              items: items.map(p => toDappItem(p, 'Cardano')),
              hasMore: nextHasMore,
            })),
          )
        : EMPTY,
    ),
  );

const collectAllCardanoPages = (
  fetchPage: (
    page: number,
  ) => Observable<{ items: CardanoCubeProject[]; hasMore: boolean }>,
): Observable<DappItem[]> =>
  streamCardanoPages(fetchPage).pipe(
    reduce<PageEmission, DappItem[]>(
      (accumulator, { items }) => [...accumulator, ...items],
      [],
    ),
  );

const buildFinalList = (cardano: DappItem[]): DappItem[] => [
  ...cardano,
  ...getMidnightDapps().map(p => toDappItem(p, 'Midnight')),
];

const fetchCategoriesAction = (
  fetchCategories: () => Observable<Array<{ slug: string }>>,
  actions: Parameters<SideEffect>[2]['actions'],
) =>
  fetchCategories().pipe(
    retryBackoff(RETRY_CONFIG),
    map(categories =>
      actions.dappExplorer.setAvailableCategories([
        'show all',
        ...categories
          .map(c => c.slug)
          .filter(slug => !EXCLUDED_CATEGORY_SLUGS.includes(slug)),
      ]),
    ),
  );

const progressiveFetch = (
  fetchPage: Parameters<typeof streamCardanoPages>[0],
  fetchCategories: Parameters<typeof fetchCategoriesAction>[0],
  actions: Parameters<SideEffect>[2]['actions'],
) =>
  concat(
    of(actions.dappExplorer.setFetchStatus('loading')),
    of(actions.dappExplorer.setExplorerList([])),
    streamCardanoPages(fetchPage).pipe(
      mergeMap(({ items }) =>
        concat(
          of(actions.dappExplorer.appendToExplorerList(items)),
          of(actions.dappExplorer.setFetchStatus('success')),
        ),
      ),
    ),
    defer(() =>
      of(
        actions.dappExplorer.appendToExplorerList(
          getMidnightDapps().map(p => toDappItem(p, 'Midnight')),
        ),
      ),
    ),
    of(actions.dappExplorer.setFetchStatus('success')),
    // Persist the cache timestamp only after categories succeed, so a categories
    // failure doesn't lock retries for 24h.
    fetchCategoriesAction(fetchCategories, actions),
    of(actions.dappExplorer.setLastFetchedAt(Date.now())),
  );

const MIN_REFRESH_SKELETON_MS = 300;

const backgroundRefresh = (
  fetchPage: Parameters<typeof collectAllCardanoPages>[0],
  fetchCategories: Parameters<typeof fetchCategoriesAction>[0],
  actions: Parameters<SideEffect>[2]['actions'],
) =>
  concat(
    // Reveal cached list immediately; fetch happens behind it.
    of(actions.dappExplorer.setFetchStatus('success')),
    collectAllCardanoPages(fetchPage).pipe(
      mergeMap(cardano =>
        concat(
          of(actions.dappExplorer.setFetchStatus('loading')),
          timer(MIN_REFRESH_SKELETON_MS).pipe(
            mergeMap(() =>
              concat(
                of(
                  actions.dappExplorer.setExplorerList(buildFinalList(cardano)),
                ),
                of(actions.dappExplorer.setFetchStatus('success')),
                fetchCategoriesAction(fetchCategories, actions),
                of(actions.dappExplorer.setLastFetchedAt(Date.now())),
              ),
            ),
          ),
        ),
      ),
    ),
  );

export const loadDapps: SideEffect = (
  { dappExplorer: { loadDappsRequested$ } },
  { dappExplorer: { getLastFetchedAt$, getDappList$ } },
  { actions, cardanoCubeProvider: { fetchProjectPage, fetchCategories } },
) => {
  const startup$ = defer(() =>
    combineLatest([getLastFetchedAt$, getDappList$]).pipe(
      take(1),
      exhaustMap(([lastFetchedAt, list]) => {
        const hasCache = list.length > 0;
        const age =
          lastFetchedAt == null ? Infinity : Date.now() - lastFetchedAt;

        if (!hasCache) {
          return progressiveFetch(
            fetchProjectPage,
            fetchCategories,
            actions,
          ).pipe(
            catchError(() => of(actions.dappExplorer.setFetchStatus('error'))),
          );
        }

        if (age <= CACHE_TTL_MS) {
          return of(actions.dappExplorer.setFetchStatus('success'));
        }

        return backgroundRefresh(
          fetchProjectPage,
          fetchCategories,
          actions,
        ).pipe(
          catchError(() => of(actions.dappExplorer.setFetchStatus('error'))),
        );
      }),
    ),
  );

  const retry$ = loadDappsRequested$.pipe(
    exhaustMap(() =>
      progressiveFetch(fetchProjectPage, fetchCategories, actions).pipe(
        catchError(() => of(actions.dappExplorer.setFetchStatus('error'))),
      ),
    ),
  );

  return merge(startup$, retry$);
};
