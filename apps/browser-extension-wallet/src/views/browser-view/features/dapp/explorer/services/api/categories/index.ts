import { useState, useEffect } from 'react';
import { DefaultCategory } from '../../../components/SimpleView/SimpleViewFilters/CategoryChip/categories.enum';

type FetchCategoriesResult = {
  loading: boolean;
  data: string[];
};

const dappRadarCategoriesUrl = `${process.env.DAPP_RADAR_API_URL}/v2/dapps/categories`;
const dappRadarApiKey = process.env.DAPP_RADAR_API_KEY;

const defaultCategories = Object.values(DefaultCategory).filter((c) => c !== DefaultCategory.All);

export const useCategoriesFetcher = (): FetchCategoriesResult => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!dappRadarApiKey) {
        setData(defaultCategories);
        setLoading(false);
        return;
      }

      try {
        const response = await window.fetch(dappRadarCategoriesUrl, {
          headers: {
            Accept: 'application/json',
            'x-api-key': dappRadarApiKey
          }
        });

        let categories: string[] = [];
        if (response.ok) {
          const result = (await response.json()) as { categories: string[] };
          categories = result.categories;
        }
        setData(categories);
      } catch {
        console.error('Failed to fetch dapp categories.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, data };
};
