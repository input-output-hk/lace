import { useState, useEffect, useMemo } from 'react';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { cacheRequest } from '@views/browser/features/dapp/explorer/services/cache';
import { logger } from '@lace/common';

type FetchCategoriesResult = {
  loading: boolean;
  data: string[];
};

const dappRadarCategoriesUrl = `${process.env.DAPP_RADAR_API_URL}/v2/dapps/categories`;
const dappRadarApiKey = process.env.DAPP_RADAR_API_KEY;

export const useCategoriesFetcher = (): FetchCategoriesResult => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<string[]>([]);
  const dappExplorerFeaturePayload = usePostHogClientContext().getFeatureFlagPayload('dapp-explorer');

  const disallowedDappCategories = useMemo(
    () =>
      dappExplorerFeaturePayload
        ? new Set<string>(dappExplorerFeaturePayload.disallowedCategories.legalIssues)
        : new Set<string>(),
    [dappExplorerFeaturePayload]
  );

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
        logger.error('Failed to fetch dapp categories.', error);
      }

      categories = categories.filter((category) => !disallowedDappCategories.has(category));

      setData(categories);
      setLoading(false);
    })();
  }, [disallowedDappCategories]);

  return { loading, data };
};
