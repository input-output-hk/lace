import { useEffect, useState } from 'react';
import { PaginationInput } from './types';
import { mockedDapps as mockedData } from './dapps';
import { ISectionCardItem } from '@views/browser/features/dapp/explorer/services/helpers/apis-formatter/types';

const mockedDapps = Array.from({ length: 10 })
  .fill(1)
  .flatMap(() => mockedData);

type DAppFetcherParams = {
  category?: string;
  search?: string;
  page?: PaginationInput;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars
const useDAppFetcher = ({ page: { limit } }: DAppFetcherParams) => {
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [data, setData] = useState<ISectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const fetchingTime = 600;
      await new Promise((resolve) => setTimeout(resolve, fetchingTime));

      const requestedItemsCount = (currentPage + 1) * limit;
      const items = mockedDapps.slice(0, requestedItemsCount);
      if (items.length < requestedItemsCount) {
        setHasNextPage(false);
      }
      setData(items);
      setLoading(false);
    })();
  }, [currentPage, limit]);

  const fetchMore = () => {
    if (!hasNextPage) return;
    setCurrentPage(currentPage + 1);
  };

  return { loading, data, error: undefined as Error, fetchMore, hasNextPage };
};

export { useDAppFetcher };
