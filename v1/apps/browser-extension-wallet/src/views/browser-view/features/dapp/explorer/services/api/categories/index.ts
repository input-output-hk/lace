import { useState, useEffect, useMemo } from 'react';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { getCachedCategories } from '@views/browser/features/dapp/explorer/services/api/static/dataSource';

type FetchCategoriesResult = {
  loading: boolean;
  data: string[];
};

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
    setLoading(true);

    const categories = getCachedCategories().filter((category) => !disallowedDappCategories.has(category));

    setData(categories);
    setLoading(false);
  }, [disallowedDappCategories]);

  return { loading, data };
};
