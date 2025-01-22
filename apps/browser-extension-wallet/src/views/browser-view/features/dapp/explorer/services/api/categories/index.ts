import { useState, useEffect } from 'react';
import { cacheRequest } from '@views/browser/features/dapp/explorer/services/cache';

type FetchCategoriesResult = {
  loading: boolean;
  data: string[];
};

const dappRadarCategoriesUrl = `${process.env.DAPP_RADAR_API_URL}/v2/dapps/categories`;
const dappRadarApiKey = process.env.DAPP_RADAR_API_KEY;

export const useCategoriesFetcher = (): FetchCategoriesResult => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!dappRadarApiKey) {
        setLoading(false);
        return;
      }

      let categories: string[] = [];
      try {
        categories = await cacheRequest(dappRadarCategoriesUrl, async () => {
          const response = await window.fetch(dappRadarCategoriesUrl, {
            headers: {
              Accept: 'application/json',
              'x-api-key': dappRadarApiKey
            }
          });

          if (!response.ok) {
            throw new Error('Unexpected response');
          }

          const result = (await response.json()) as { categories: string[] };
          return result.categories;
        });
      } catch (error) {
        console.error('Failed to fetch dapp categories.', error);
      }

      setData(categories);
      setLoading(false);
    })();
  }, []);

  return { loading, data };
};
