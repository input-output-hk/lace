import { useEffect, useState } from 'react';
import { ISectionCardItem } from '@views/browser/features/dapp/explorer/services/helpers/apis-formatter/types';

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

const mapResponse = (dapps: DAppRadarDappItem[]): ISectionCardItem[] =>
  dapps.map((dapp) => ({
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
    screenshots: undefined

    // title: string;
    // shortDescription: string;
    // subcategory: string;
    // link: string;
    // image?: Partial<ISectionCardItemImage>;
    // longDescription: string;
    // screenshots?: IScreenshot[];
    // providerName: string;
    // email: string;
    // companyWebsite: string;
    // certificates?: Partial<ISectionCardCertificate[]>;
    // selectedCertificate?: Partial<ISectionCardCertificate>;
    // isCertified?: boolean;
  }));

type DAppFetcherParams = {
  category?: string;
  search?: string;
  page?: PaginationInput;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

const useDAppFetcher = ({ category, page: { limit } }: DAppFetcherParams) => {
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [data, setData] = useState<ISectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const searchParams = new URLSearchParams('');
      searchParams.set('chain', 'cardano');
      searchParams.set('range', '30d');
      searchParams.set('top', '100');
      if (category) {
        searchParams.set('category', category);
      }
      const response = await window.fetch(`${dappRadarApiUrl}/v2/dapps/top/uaw?${searchParams.toString()}`, {
        headers: {
          Accept: 'application/json',
          'x-api-key': dappRadarApiKey
        }
      });
      const { results } = (await response.json()) as { results: DAppRadarDappItem[] };
      // const requestedItemsCount = (currentPage + 1) * limit;
      // const items = mockedDapps.slice(0, requestedItemsCount);
      // if (items.length < requestedItemsCount) {
      setHasNextPage(false);
      // }
      setData(mapResponse(results));
      setLoading(false);
    })();
  }, [category, currentPage, limit]);

  const fetchMore = () => {
    if (!hasNextPage) return;
    setCurrentPage(currentPage + 1);
  };

  return { loading, data, error: undefined as Error, fetchMore, hasNextPage };
};

export { useDAppFetcher };
