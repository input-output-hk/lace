import { useEffect, useMemo, useState } from 'react';
import { ISectionCardItem } from '@views/browser/features/dapp/explorer/services/helpers/apis-formatter/types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

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

const mapResponse = (dapps: DAppRadarDappItem[], disallowedDappIds: Set<number>): ISectionCardItem[] =>
  dapps
    .filter(({ dappId }) => !disallowedDappIds.has(dappId))
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

  const disallowedDappIds = useMemo(
    () =>
      dappExplorerFeaturePayload
        ? new Set<number>([
            ...dappExplorerFeaturePayload.disallowedDapps.legalIssues,
            ...dappExplorerFeaturePayload.disallowedDapps.connectivityIssues
          ])
        : new Set<number>(),
    [dappExplorerFeaturePayload]
  );

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

      try {
        const response = await window.fetch(`${dappRadarApiUrl}/v2/dapps/top/uaw?${searchParams.toString()}`, {
          headers: {
            Accept: 'application/json',
            'x-api-key': dappRadarApiKey
          }
        });

        let results: DAppRadarDappItem[] = [];
        if (response.ok) {
          const parsedResponse = (await response.json()) as { results: DAppRadarDappItem[] };
          results = parsedResponse.results;
        }
        setData(results);
      } catch {
        console.error('Failed to fetch dapp list.');
      } finally {
        setLoading(false);
      }
    })();
  }, [category, limit]);

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const fetchMore = () => {
    console.error('Pagination not implemented!');
  };

  return { loading, data: mapResponse(data, disallowedDappIds), fetchMore, hasNextPage: false };
};

export { useDAppFetcher };
