import { from } from 'rxjs';

import { CARDANO_CUBE_PER_PAGE } from '../const';
import {
  CardanoCubeCategoriesResponseSchema,
  CardanoCubeProjectsResponseSchema,
} from '../types';

import type { CardanoCubeCategory, CardanoCubeProject } from '../types';
import type { LaceInitSync } from '@lace-contract/module';
import type { Observable } from 'rxjs';

type FetchPageResult<T> = { items: T[]; hasMore: boolean };

const fetchJson = async (
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`CardanoCube API error: ${response.status} ${url}`);
  }
  return response.json();
};

export const createCardanoCubeProvider = (baseUrl: string) => {
  const fetchProjectPage = (
    page: number,
  ): Observable<FetchPageResult<CardanoCubeProject>> =>
    from(
      fetchJson(
        `${baseUrl}/api/v1/projects?page=${page}&per_page=${CARDANO_CUBE_PER_PAGE}`,
      ).then(raw => {
        const parsed = CardanoCubeProjectsResponseSchema.parse(raw);
        return {
          items: parsed.projects,
          hasMore: parsed.pagination.next != null,
        };
      }),
    );

  const fetchCategories = (): Observable<CardanoCubeCategory[]> =>
    from(
      fetchJson(`${baseUrl}/api/v1/categories?per_page=500`, {
        Accept: 'application/json',
      }).then(raw => CardanoCubeCategoriesResponseSchema.parse(raw).categories),
    );

  return { fetchProjectPage, fetchCategories };
};

export type CardanoCubeProvider = ReturnType<typeof createCardanoCubeProvider>;

export const initializeDependencies: LaceInitSync<{
  cardanoCubeProvider: CardanoCubeProvider;
}> = ({ runtime: { config } }) => ({
  cardanoCubeProvider: createCardanoCubeProvider(config.cardanoCubeBaseUrl!),
});
