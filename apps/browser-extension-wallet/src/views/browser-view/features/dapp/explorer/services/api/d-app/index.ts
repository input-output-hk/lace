import { useEffect, useMemo, useState } from 'react';
import { ISectionCardItem } from '@views/browser/features/dapp/explorer/services/helpers/apis-formatter/types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { logger } from '@lace/common';
import { getCachedDapps, getLogoUrl } from '@views/browser/features/dapp/explorer/services/api/static/dataSource';
import type { DAppRadarDappItem } from '@views/browser/features/dapp/explorer/services/api/static/dataSource';

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
        src: getLogoUrl(dapp.logo),
        alt: dapp.name
      },
      shortDescription: dapp.description,
      longDescription: dapp.fullDescription,
      email: '',
      link: dapp.website,
      companyWebsite: '',
      socialLinks: dapp.socialLinks
    }));

type DAppFetcherParams = {
  category?: string;
  search?: string;
  // todo: re-instate later if we see fit (TBD)
  _subcategory?: string;
};

const useDAppFetcher = ({
  category
}: DAppFetcherParams): {
  loading: boolean;
  data: ISectionCardItem[];
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
    setLoading(true);

    try {
      const allDapps = getCachedDapps();
      const filtered = allDapps.filter((dapp) => {
        if (!category) {
          return true;
        }
        return dapp.categories.includes(category);
      });

      setData(filtered);
    } catch (error) {
      logger.error('Failed to read cached dapp list.', error);
      setData([]);
    }

    setLoading(false);
  }, [category]);

  return {
    loading,
    data: mapResponse(data, disallowedDappIds, disallowedDappCategories)
  };
};

export { useDAppFetcher };
