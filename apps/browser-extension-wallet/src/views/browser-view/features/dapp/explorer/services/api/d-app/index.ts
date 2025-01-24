import { useEffect, useMemo, useState } from 'react';
import { ISectionCardItem } from '@views/browser/features/dapp/explorer/services/helpers/apis-formatter/types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { cacheRequest } from '@views/browser/features/dapp/explorer/services/cache';

const dappRadarApiUrl = process.env.DAPP_RADAR_API_URL;
const dappRadarApiKey = process.env.DAPP_RADAR_API_KEY;

export type PaginationInput = {
  offset: number;
  limit: number;
};

type DAppRadarDappItem = {
  dappId: number;
  name: string;
  description: string;
  fullDescription: string;
  logo: string;
  link: string;
  website: string;
  chains: string[];
  categories: string[];
  socialLinks: Array<{
    title: string;
    type: string;
    url: string;
  }>;
  metrics: {
    transactions: number;
    transactionsPercentageChange: number;
    uaw: number;
    uawPercentageChange: number;
    volume: number;
    volumePercentageChange: number;
    balance: number;
    balancePercentageChange: number;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

const mapResponse = (
  dapps: DAppRadarDappItem[],
  disallowedDappIds: Set<number>,
  disallowedDappCategories: Set<string>
): ISectionCardItem[] =>
  dapps
    .filter(
      ({ dappId, categories }) =>
        !disallowedDappIds.has(dappId) && !categories.some((category) => disallowedDappCategories.has(category))
    )
    .map((dapp) => ({
      id: String(dapp.dappId),
      categories: dapp.categories,
      title: dapp.name,
      image: {
        src: dapp.logo,
        alt: dapp.name
      },
      certificates: undefined,
      shortDescription: dapp.description,
      longDescription: dapp.fullDescription,
      email: '',
      link: dapp.website,
      companyWebsite: '',
      screenshots: undefined,
      socialLinks: dapp.socialLinks
    }));

type DAppFetcherParams = {
  category?: string;
  search?: string;
  page?: PaginationInput;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

const useDAppFetcher = ({
  category,
  page: { limit }
}: DAppFetcherParams): {
  loading: boolean;
  data: ISectionCardItem[];
  fetchMore: () => void;
  hasNextPage: boolean;
} => {
  const [data, setData] = useState<DAppRadarDappItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dappExplorerFeaturePayload = usePostHogClientContext().getFeatureFlagPayload('dapp-explorer');

  const { disallowedDappIds, disallowedDappCategories } = useMemo(() => {
    if (!dappExplorerFeaturePayload) {
      return {
        disallowedDappIds: new Set<number>(),
        disallowedDappCategories: new Set<string>()
      };
    }

    return {
      disallowedDappIds: new Set<number>([
        ...dappExplorerFeaturePayload.disallowedDapps.legalIssues,
        ...dappExplorerFeaturePayload.disallowedDapps.connectivityIssues
      ]),
      disallowedDappCategories: new Set<string>(dappExplorerFeaturePayload.disallowedCategories.legalIssues)
    };
  }, [dappExplorerFeaturePayload]);

  useEffect(() => {
    (async () => {
      if (!dappRadarApiKey) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const searchParams = new URLSearchParams('');
      searchParams.set('chain', 'cardano');
      searchParams.set('range', '30d');
      searchParams.set('top', '100');
      if (category) {
        searchParams.set('category', category);
      }

      let results: DAppRadarDappItem[] = [];
      const url = `${dappRadarApiUrl}/v2/dapps/top/uaw?${searchParams.toString()}`;
      try {
        results = await cacheRequest(url, async () => {
          const response = await window.fetch(url, {
            headers: {
              Accept: 'application/json',
              'x-api-key': dappRadarApiKey
            }
          });

          if (!response.ok) {
            throw new Error('Unexpected response');
          }

          const parsedResponse = (await response.json()) as { results: DAppRadarDappItem[] };
          return parsedResponse.results;
        });
      } catch (error) {
        console.error('Failed to fetch dapp list.', error);
      }

      setData(results);
      setLoading(false);
    })();
  }, [category, limit]);

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const fetchMore = () => {
    console.error('Pagination not implemented!');
  };

  return {
    loading,
    data: mapResponse(data, disallowedDappIds, disallowedDappCategories),
    fetchMore,
    hasNextPage: false
  };
};

export { useDAppFetcher };
