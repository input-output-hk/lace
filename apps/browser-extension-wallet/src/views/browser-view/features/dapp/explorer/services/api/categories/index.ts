import { useState, useEffect } from 'react';
import { ICategory } from './types';
import capitalize from 'lodash/capitalize';

const defaultCategories = [
  'games',
  'defi',
  'collectibles',
  'marketplaces',
  'high-risk',
  'gambling',
  'exchanges',
  'social',
  'other'
];

const formatCategories = (categories: string[]) =>
  categories.map((category, index) => ({
    id: `${category.toLowerCase()}${index}`,
    name: capitalize(category)
  }));

type FetchCategoriesResult = {
  loading: boolean;
  error?: Error;
  data: ICategory[];
};

const dappRadarCategoriesUrl = `${process.env.DAPP_RADAR_API_URL}/v2/dapps/categories`;

export const useCategoriesFetcher = (): FetchCategoriesResult => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<ICategory[]>(formatCategories(defaultCategories));

  useEffect(() => {
    (async () => {
      try {
        const response = await window.fetch(dappRadarCategoriesUrl, {
          headers: {
            Accept: 'application/json',
            'x-api-key': process.env.DAPP_RADAR_API_KEY
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const result = await response.json();
        setData(formatCategories(result));
      } catch (_error) {
        setError(_error as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, data, error };
};
