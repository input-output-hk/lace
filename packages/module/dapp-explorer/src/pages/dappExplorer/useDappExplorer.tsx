import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

type PlatformKey = 'android' | 'ios' | 'web';

type PlatformFilters = {
  disallowedDapps?: Record<string, number[]>;
  disallowedCategories?: Record<string, string[]>;
  disallowedTags?: Record<string, string[]>;
};

type DappExplorerPayload = {
  availableChains?: string[];
  disallowedDapps?: Record<string, number[]>;
  disallowedCategories?: Record<string, string[]>;
  disallowedTags?: Record<string, string[]>;
  ios?: PlatformFilters;
  android?: PlatformFilters;
  web?: PlatformFilters;
  showStatistics?: boolean;
};

const DEBOUNCE_DELAY_MS = 300;

const getCurrentPlatform = (): PlatformKey => {
  const os = Platform.OS;
  if (os === 'ios') return 'ios';
  if (os === 'android') return 'android';
  return 'web';
};

const mergeRecordArrays = <T,>(
  global: Record<string, T[]> | undefined,
  platform: Record<string, T[]> | undefined,
): Record<string, T[]> => {
  const result: Record<string, T[]> = { ...(global ?? {}) };
  if (platform) {
    for (const [key, values] of Object.entries(platform)) {
      result[key] = [...(result[key] ?? []), ...values];
    }
  }
  return result;
};

import {
  useDispatchLaceAction,
  useLaceSelector,
} from '../../hooks/lace-context';
import {
  getCachedCategories,
  getCachedDapps,
  getLogoUrl,
  type DAppRadarDappItem,
} from '../../static/dataSource';
import {
  DappCategorySchemaWithUnknown,
  DappRadarItemSchema,
} from '../../types';
import { getDappCategoryLabel } from '../../util/text-utils';

import type { DAppRadarItem } from '../../types';
import type {
  DappExplorerListItem,
  DappExplorerPageTemplateProps,
} from '@lace-lib/ui-toolkit';

export const useDappExplorer = (): DappExplorerPageTemplateProps => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Dapp explorer slice
  const fetchStatus = useLaceSelector('dappExplorer.getFetchStatus');
  const dappSearchParams = useLaceSelector('dappExplorer.getSearchParams');
  const dappList = useLaceSelector('dappExplorer.getDappList');
  const setDappSearchCategories = useDispatchLaceAction(
    'dappExplorer.setAvailableCategories',
  );
  const setDappList = useDispatchLaceAction('dappExplorer.setExplorerList');
  const setFetchStatus = useDispatchLaceAction('dappExplorer.setFetchStatus');
  const setDappSearchParams = useDispatchLaceAction(
    'dappExplorer.setSearchParams',
  );

  const [localSearchValue, setLocalSearchValue] = useState(
    () => dappSearchParams?.searchValue ?? '',
  );
  const lastStoreUpdateFromDebounceRef = useRef(false);
  const debouncedSetSearchParamsRef = useRef(
    debounce((searchValue: string) => {
      setDappSearchParams({ searchValue });
      lastStoreUpdateFromDebounceRef.current = true;
    }, DEBOUNCE_DELAY_MS),
  );

  useEffect(() => {
    return () => {
      debouncedSetSearchParamsRef.current.cancel();
    };
  }, []);

  // Only sync local from store when the change was external (e.g. Clear); skip when our debounce just wrote.
  useEffect(() => {
    if (lastStoreUpdateFromDebounceRef.current) {
      lastStoreUpdateFromDebounceRef.current = false;
      return;
    }
    debouncedSetSearchParamsRef.current.cancel();
    setLocalSearchValue(dappSearchParams?.searchValue ?? '');
  }, [dappSearchParams?.searchValue]);

  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');

  const currentPlatform = getCurrentPlatform();

  const disallowedCategories = useMemo<string[]>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<DappExplorerPayload> | undefined;

    const globalGroups = dappExplorerFlag?.payload?.disallowedCategories;
    const platformGroups =
      dappExplorerFlag?.payload?.[currentPlatform]?.disallowedCategories;
    const mergedGroups = mergeRecordArrays(globalGroups, platformGroups);

    const result = Object.values(mergedGroups).flat();
    return result;
  }, [loadedFeatures, currentPlatform]);

  const disallowedDapps = useMemo<Record<string, number[]>>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<DappExplorerPayload> | undefined;

    const globalGroups = dappExplorerFlag?.payload?.disallowedDapps;
    const platformGroups =
      dappExplorerFlag?.payload?.[currentPlatform]?.disallowedDapps;
    const mergedGroups = mergeRecordArrays(globalGroups, platformGroups);

    return mergedGroups;
  }, [loadedFeatures, currentPlatform]);

  const disallowedTags = useMemo<string[]>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<DappExplorerPayload> | undefined;

    const globalGroups = dappExplorerFlag?.payload?.disallowedTags;
    const platformGroups =
      dappExplorerFlag?.payload?.[currentPlatform]?.disallowedTags;
    const mergedGroups = mergeRecordArrays(globalGroups, platformGroups);

    const result = Object.values(mergedGroups).flat();
    return result;
  }, [loadedFeatures, currentPlatform]);

  const onSelectDapp = useCallback(
    (dappId: number) => {
      if (!navigation.isFocused()) return;
      NavigationControls.sheets.navigate(SheetRoutes.DappDetail, {
        activeDapp: dappId,
      });
      // TODO: Analytics trackEvent() with properties
    },
    [navigation],
  );

  const onOpenFilters = useCallback(() => {
    // Bug (iOS): opening any sheet after swipe-closing the DApp filter sheet
    // would show DApp filter content instead of the intended sheet content.
    // Root cause: React Navigation keeps all tab screens mounted. On iOS,
    // react-native-gesture-handler registers gesture recognizers at the native
    // layer, before React Native checks view visibility. So this Pressable can
    // fire even when the DApp tab is hidden behind another tab, causing
    // navigate(DappFilterControls) to run unintentionally during interactions
    // on other tabs. Returning early when not focused prevents this.
    if (!navigation.isFocused()) return;
    NavigationControls.sheets.navigate(SheetRoutes.DappFilterControls);
  }, [navigation]);

  const loadCategories = useCallback((): void => {
    try {
      const cachedCategories = getCachedCategories(disallowedCategories);
      setDappSearchCategories(
        DappCategorySchemaWithUnknown.array().parse([
          'show all',
          ...cachedCategories,
        ]),
      );
    } catch {
      setFetchStatus('error');
    }
  }, [disallowedCategories, setDappSearchCategories, setFetchStatus]);

  const loadDapps = useCallback((): void => {
    try {
      const allDapps = getCachedDapps(disallowedDapps);

      // Filter dapps based on search params
      let filteredDapps: DAppRadarDappItem[] = allDapps;

      // Filter out dapps with disallowed categories
      if (disallowedCategories.length > 0) {
        const disallowedSet = new Set(disallowedCategories);
        filteredDapps = filteredDapps.filter(
          dapp =>
            !dapp.categories.some(category => disallowedSet.has(category)),
        );
      }

      // Filter out dapps with disallowed tags
      if (disallowedTags.length > 0) {
        const disallowedTagSet = new Set(disallowedTags);
        filteredDapps = filteredDapps.filter(
          dapp =>
            !dapp.tags.some(
              tag =>
                disallowedTagSet.has(tag.slug) ||
                disallowedTagSet.has(tag.name),
            ),
        );
      }

      // Filter out inactive dapps
      filteredDapps = filteredDapps.filter(dapp => dapp.isActive);

      // Filter by chain if specified
      if (dappSearchParams?.chain) {
        const chainLower = dappSearchParams.chain.toLowerCase();
        filteredDapps = filteredDapps.filter(dapp =>
          dapp.chains.some(chain => chain.toLowerCase() === chainLower),
        );
      }

      // Filter by category if specified and not "show all"
      if (
        dappSearchParams?.category &&
        dappSearchParams.category !== 'show all'
      ) {
        filteredDapps = filteredDapps.filter(dapp =>
          dapp.categories.includes(dappSearchParams.category),
        );
      }

      // Convert DAppRadarDappItem to DAppRadarItem format
      const convertedDapps: DAppRadarItem[] = filteredDapps.map(dapp => ({
        ...dapp,
        link: dapp.website,
        logo: getLogoUrl(dapp.logo),
      }));

      setDappList(DappRadarItemSchema.array().parse(convertedDapps));
    } catch {
      setFetchStatus('error');
    }
  }, [
    dappSearchParams.chain,
    dappSearchParams.category,
    disallowedCategories,
    disallowedDapps,
    disallowedTags,
    setDappList,
    setFetchStatus,
  ]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadDapps();
  }, [loadDapps]);

  const fuse = useMemo(
    () =>
      new Fuse(dappList, {
        keys: ['name', 'website', 'description'],
        threshold: 0.2,
        ignoreLocation: true,
      }),
    [dappList],
  );

  const filteredDappList = useMemo(() => {
    const searchValue = dappSearchParams.searchValue?.trim();
    if (!searchValue) {
      return dappList;
    }
    return fuse.search(searchValue).map(result => result.item);
  }, [dappList, dappSearchParams.searchValue, fuse]);

  const items = useMemo<DappExplorerListItem[]>(
    () =>
      filteredDappList.map(dapp => ({
        dappId: dapp.dappId,
        logoUrl: dapp.logo,
        name: dapp.name,
        categoriesText: dapp.categories
          .map(category => getDappCategoryLabel(t, category))
          .join(', '),
      })),
    [filteredDappList, t],
  );

  const listScrollResetKey = JSON.stringify([
    dappSearchParams.searchValue,
    dappSearchParams.category,
    dappSearchParams.chain ?? '',
  ]);

  return {
    title: t('v2.dapp-explorer.pageHeading'),
    isLoading: fetchStatus === 'loading',
    searchValue: localSearchValue,
    onSearchChange: (searchValue: string) => {
      setLocalSearchValue(searchValue);
      debouncedSetSearchParamsRef.current(searchValue);
    },
    onOpenFilters,
    isFilterActive: dappSearchParams.category !== 'show all',
    items,
    listScrollResetKey,
    onSelectDapp,
    testID: 'dapp-explorer-page',
  };
};
