import { useState } from 'react';
import { IDApp, PaginationInput } from './types';
import mockedData from './dapps';

type DAppFetcherParams = {
  category?: string;
  search?: string;
  page?: PaginationInput;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

const useDAppFetcher = (_params: DAppFetcherParams) => {
  const [hasNextPage] = useState(true);

  // todo: handle errors
  const { loading, error, data } = {
    loading: false,
    error: null as Error | null,
    data: mockedData
  };

  const fetchMore = (): IDApp[] => [];

  return { loading, data, error, fetchMore, hasNextPage };
};

export { useDAppFetcher };
export type UseDAppFetcherReturnType = ReturnType<typeof useDAppFetcher>;
