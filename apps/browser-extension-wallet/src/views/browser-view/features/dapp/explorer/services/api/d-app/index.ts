import { QueryResult, useQuery } from '@apollo/client';
import { createDappItems } from '../../../services/helpers/apis-formatter';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useState } from 'react';
import { defaultPaginationInput, GET_DAPPS_QUERY, SEARCH_DAPPS_QUERY } from './dapps.gql';
import { IDApp, PaginationInput } from './types';

type DAppFetcherParams = {
  category?: string;
  search?: string;
  page?: PaginationInput;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

type ResponseData = {
  SearchDapps?: IDApp[];
  dapps?: IDApp[];
};

const useDAppFetcher = ({ category, search, page = defaultPaginationInput }: DAppFetcherParams) => {
  const [hasNextPage, setHasNextPage] = useState(true);
  const isSearchQuery = search || category;
  const gqlQuery = isSearchQuery ? SEARCH_DAPPS_QUERY : GET_DAPPS_QUERY;
  const maybeSearch = search && { dappName: search };
  const maybeCategory = category && { categoryName: category };

  const variables = {
    ...maybeSearch,
    ...maybeCategory,
    ...page
  };

  // todo: handle errors
  const {
    loading,
    error,
    data,
    client,
    fetchMore: originalFetchMore
  } = useQuery<ResponseData>(gqlQuery, {
    variables,
    fetchPolicy: 'cache-and-network', // Apollo Client executes the first query against both the cache and your GraphQL server. The query automatically updates if the result of the server-side query modifies cached fields.
    nextFetchPolicy: 'cache-first' // Apollo Client executes subsequent queries against the cache. If all requested data is present in the cache, that data is returned. Otherwise, Apollo Client executes the query against your GraphQL server and returns that data after caching it.
  });

  const dappsResponseKey = data?.hasOwnProperty('SearchDapps') ? 'SearchDapps' : 'dapps';

  const dappItems: ISectionCardItem[] = data?.[dappsResponseKey]?.map(createDappItems) || [];

  const fetchMore: QueryResult<ResponseData>['fetchMore'] = async (...args) => {
    const result = await originalFetchMore(...args);
    const nextPageDataLength = (result.data as ResponseData | undefined)?.[dappsResponseKey]?.length;
    setHasNextPage(nextPageDataLength === page.limit);
    return result;
  };

  return { loading, data: dappItems, error, fetchMore, client, hasNextPage };
};

export { useDAppFetcher };
export type UseDAppFetcherReturnType = ReturnType<typeof useDAppFetcher>;
