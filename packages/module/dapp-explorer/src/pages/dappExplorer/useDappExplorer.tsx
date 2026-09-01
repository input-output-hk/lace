import { useAnalytics } from '@lace-contract/analytics';
import {
  getFaviconUrl,
  isExplicitHttpUrl,
  normalizeUrlForId,
  tryParseExternalUrl,
} from '@lace-contract/custom-dapps';
import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { EXCLUDED_CATEGORY_SLUGS } from '../../const';
import {
  useDispatchLaceAction,
  useLaceSelector,
} from '../../hooks/lace-context';
import { getDappCategoryLabel } from '../../util/text-utils';

import type {
  DappExplorerListItem,
  DappExplorerPageTemplateProps,
} from '@lace-lib/ui-toolkit';

// Sentinel id for the synthetic "open external URL" list item.
const EXTERNAL_URL_ITEM_ID = -1;

type PlatformKey = 'android' | 'ios' | 'web';

type PlatformFilters = {
  disallowedDapps?: Record<string, string[]>;
  disallowedCategories?: Record<string, string[]>;
  alwaysVisibleSlugs?: string[];
};

type DappExplorerPayload = {
  availableChains?: string[];
  disallowedDapps?: Record<string, string[]>;
  disallowedCategories?: Record<string, string[]>;
  alwaysVisibleSlugs?: string[];
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

export type CustomUrlDisclaimer = {
  visible: boolean;
  url: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export type UseDappExplorerResult = DappExplorerPageTemplateProps & {
  customUrlDisclaimer: CustomUrlDisclaimer;
};

export const useDappExplorer = (): UseDappExplorerResult => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const navigation = useNavigation();

  // Dapp explorer slice
  const fetchStatus = useLaceSelector('dappExplorer.getFetchStatus');
  const dappSearchParams = useLaceSelector('dappExplorer.getSearchParams');
  const dappList = useLaceSelector('dappExplorer.getDappList');
  const customDappList = useLaceSelector('customDapps.selectCustomDappList');
  const setDappSearchParams = useDispatchLaceAction(
    'dappExplorer.setSearchParams',
  );
  const dispatchLoadDapps = useDispatchLaceAction(
    'dappExplorer.loadDappsRequested',
    true,
  );

  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(
    null,
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
  const isWebPlatform = currentPlatform === 'web';

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

  const disallowedSlugs = useMemo<string[]>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<DappExplorerPayload> | undefined;

    const globalGroups = dappExplorerFlag?.payload?.disallowedDapps;
    const platformGroups =
      dappExplorerFlag?.payload?.[currentPlatform]?.disallowedDapps;
    const mergedGroups = mergeRecordArrays(globalGroups, platformGroups);

    return Object.values(mergedGroups).flat();
  }, [loadedFeatures, currentPlatform]);

  const alwaysVisibleSlugs = useMemo<string[]>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<DappExplorerPayload> | undefined;

    const globalSlugs = dappExplorerFlag?.payload?.alwaysVisibleSlugs ?? [];
    const platformSlugs =
      dappExplorerFlag?.payload?.[currentPlatform]?.alwaysVisibleSlugs ?? [];
    return [...globalSlugs, ...platformSlugs];
  }, [loadedFeatures, currentPlatform]);

  const shouldShowHttpHint = useMemo(
    () => !isWebPlatform && isExplicitHttpUrl(localSearchValue),
    [isWebPlatform, localSearchValue],
  );
  const externalUrl = useMemo(
    () => (isWebPlatform ? undefined : tryParseExternalUrl(localSearchValue)),
    [isWebPlatform, localSearchValue],
  );

  const openExternalUrl = useCallback(
    (url: string, options?: { canFavorite?: boolean }) => {
      if (!navigation.isFocused()) return;
      NavigationControls.navigate(StackRoutes.DappExternalWebView, {
        title: url,
        dapp: { icon: { fallback: url }, name: url, category: '' },
        buttonUrl: url,
        canFavorite: options?.canFavorite,
      });
    },
    [navigation],
  );

  const customDappById = useMemo(() => {
    const map: Record<string, (typeof customDappList)[number]> = {};
    for (const dapp of customDappList) map[dapp.id] = dapp;
    return map;
  }, [customDappList]);

  const curatedUrlSet = useMemo(() => {
    const set = new Set<string>();
    for (const dapp of dappList) {
      if (dapp.website) set.add(normalizeUrlForId(dapp.website));
    }
    return set;
  }, [dappList]);

  const requestOpenExternalUrl = useCallback(
    (url: string) => {
      if (!navigation.isFocused()) return;
      const normalized = normalizeUrlForId(url);
      const savedDapp = customDappById[normalized];
      if (savedDapp) {
        openExternalUrl(savedDapp.url);
        return;
      }
      if (curatedUrlSet.has(normalized)) {
        openExternalUrl(url, { canFavorite: false });
        return;
      }
      setPendingExternalUrl(url);
    },
    [navigation, customDappById, curatedUrlSet, openExternalUrl],
  );

  const onSelectDapp = useCallback(
    (dappId: number | string) => {
      if (!navigation.isFocused()) return;
      if (dappId === EXTERNAL_URL_ITEM_ID) {
        if (externalUrl) requestOpenExternalUrl(externalUrl);
        return;
      }
      if (typeof dappId === 'string') {
        const savedDapp = customDappById[dappId];
        if (savedDapp) {
          openExternalUrl(savedDapp.url);
          return;
        }
        const dapp = dappList.find(d => d.slug === dappId);
        trackEvent('dapp explorer | dapp | press', {
          slug: dappId,
          ...(dapp?.categories[0] ? { category: dapp.categories[0] } : {}),
        });
        NavigationControls.navigate(SheetRoutes.DappDetail, {
          activeDapp: dappId,
        });
      }
    },
    [
      navigation,
      dappList,
      externalUrl,
      requestOpenExternalUrl,
      customDappById,
      openExternalUrl,
      trackEvent,
    ],
  );

  const onSubmitSearch = useCallback(() => {
    if (externalUrl) requestOpenExternalUrl(externalUrl);
  }, [externalUrl, requestOpenExternalUrl]);

  const onAcknowledgeWarning = useCallback(() => {
    if (!pendingExternalUrl) return;
    const url = pendingExternalUrl;
    setPendingExternalUrl(null);
    openExternalUrl(url);
  }, [openExternalUrl, pendingExternalUrl]);

  const onDismissWarning = useCallback(() => {
    setPendingExternalUrl(null);
  }, []);

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
    NavigationControls.navigate(SheetRoutes.DappFilterControls);
  }, [navigation]);

  // Apply feature-flag filters to the dapp list from the store
  const filteredDapps = useMemo(() => {
    let filtered = dappList;

    // Filter out explicitly disallowed slugs
    if (disallowedSlugs.length > 0) {
      const disallowedSet = new Set(disallowedSlugs);
      filtered = filtered.filter(
        dapp =>
          alwaysVisibleSlugs.includes(dapp.slug) ||
          !disallowedSet.has(dapp.slug),
      );
    }

    // Filter out dapps with disallowed categories
    if (disallowedCategories.length > 0) {
      const disallowedSet = new Set(disallowedCategories);
      filtered = filtered.filter(
        dapp =>
          alwaysVisibleSlugs.includes(dapp.slug) ||
          !dapp.categories.some((category: string) =>
            disallowedSet.has(category),
          ),
      );
    }

    // Filter out explicitly inactive dapps
    filtered = filtered.filter(
      dapp => dapp.active_status?.toLowerCase() !== 'inactive',
    );

    // Filter out dapps belonging to excluded categories
    const excludedSet = new Set(EXCLUDED_CATEGORY_SLUGS);
    filtered = filtered.filter(
      dapp => !dapp.categories.some(cat => excludedSet.has(cat)),
    );

    // Filter by chain if specified
    if (dappSearchParams?.chain) {
      const chainLower = dappSearchParams.chain.toLowerCase();
      filtered = filtered.filter(
        dapp => dapp.chain.toLowerCase() === chainLower,
      );
    }

    // Filter by category if specified and not "show all"
    if (
      dappSearchParams?.category &&
      dappSearchParams.category !== 'show all'
    ) {
      filtered = filtered.filter(dapp =>
        dapp.categories.includes(dappSearchParams.category),
      );
    }

    return filtered;
  }, [
    dappList,
    alwaysVisibleSlugs,
    disallowedSlugs,
    disallowedCategories,
    dappSearchParams?.chain,
    dappSearchParams?.category,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(filteredDapps, {
        keys: ['name', 'website', 'description'],
        threshold: 0.2,
        ignoreLocation: true,
      }),
    [filteredDapps],
  );

  const filteredDappList = useMemo(() => {
    const searchValue = dappSearchParams.searchValue?.trim();
    if (!searchValue) {
      return filteredDapps;
    }
    return fuse.search(searchValue).map(result => result.item);
  }, [filteredDapps, dappSearchParams.searchValue, fuse]);

  const filteredCustomDappList = useMemo(() => {
    const searchValue = dappSearchParams.searchValue?.trim().toLowerCase();
    if (!searchValue) return customDappList;
    return customDappList.filter(
      dapp =>
        dapp.name.toLowerCase().includes(searchValue) ||
        dapp.url.toLowerCase().includes(searchValue),
    );
  }, [customDappList, dappSearchParams.searchValue]);

  const isExternalUrlAlreadySaved = useMemo(
    () =>
      externalUrl
        ? Boolean(customDappById[normalizeUrlForId(externalUrl)])
        : false,
    [externalUrl, customDappById],
  );

  const items = useMemo<DappExplorerListItem[]>(() => {
    const dappItems: DappExplorerListItem[] = filteredDappList.map(dapp => ({
      kind: 'dapp',
      dappId: dapp.slug,
      logoUrl: dapp.logoUrl ?? '',
      name: dapp.name,
      categoriesText: dapp.categories
        .map(category => getDappCategoryLabel(t, category))
        .join(', '),
    }));

    const savedUrlLabel = String(t('v2.dapp-explorer.saved-url-label'));
    const customItems: DappExplorerListItem[] = filteredCustomDappList.map(
      dapp => ({
        kind: 'dapp',
        dappId: dapp.id,
        logoUrl: getFaviconUrl(dapp.url) ?? '',
        name: dapp.name,
        categoriesText: `${savedUrlLabel}: ${dapp.url}`,
      }),
    );

    const externalSuggestion: DappExplorerListItem[] =
      externalUrl && !isExternalUrlAlreadySaved
        ? [
            {
              kind: 'dapp',
              dappId: EXTERNAL_URL_ITEM_ID,
              logoUrl: '',
              name: t('v2.dapp-explorer.open-website'),
              categoriesText: externalUrl,
            },
          ]
        : shouldShowHttpHint
        ? [
            {
              kind: 'info',
              id: 'http-not-supported',
              label: String(t('v2.dapp-explorer.http-not-supported.title')),
              subtitle: String(
                t('v2.dapp-explorer.http-not-supported.subtitle'),
              ),
            },
          ]
        : [];

    const hasCustomItems = customItems.length > 0;
    const shouldShowDiscoverHeader = hasCustomItems && dappItems.length > 0;
    const myDappsHeader: DappExplorerListItem[] = hasCustomItems
      ? [
          {
            kind: 'header',
            id: 'my-dapps',
            label: String(t('v2.dapp-explorer.section.my-dapps')),
          },
        ]
      : [];
    const discoverHeader: DappExplorerListItem[] = shouldShowDiscoverHeader
      ? [
          {
            kind: 'header',
            id: 'discover',
            label: String(t('v2.dapp-explorer.section.discover')),
          },
        ]
      : [];

    if (!hasCustomItems) {
      return [...externalSuggestion, ...dappItems];
    }
    return [
      ...externalSuggestion,
      ...myDappsHeader,
      ...customItems,
      ...discoverHeader,
      ...dappItems,
    ];
  }, [
    filteredDappList,
    filteredCustomDappList,
    externalUrl,
    isExternalUrlAlreadySaved,
    shouldShowHttpHint,
    t,
  ]);

  const listScrollResetKey = JSON.stringify([
    dappSearchParams.searchValue,
    dappSearchParams.category,
    dappSearchParams.chain ?? '',
  ]);

  return {
    title: t('v2.dapp-explorer.pageHeading'),
    isLoading: fetchStatus === 'loading',
    hasError: fetchStatus === 'error',
    onRetry: dispatchLoadDapps,
    searchValue: localSearchValue,
    searchPlaceholder: isWebPlatform
      ? undefined
      : t('v2.dapp-explorer.search-placeholder'),
    onSearchChange: (searchValue: string) => {
      setLocalSearchValue(searchValue);
      debouncedSetSearchParamsRef.current(searchValue);
    },
    onSubmitSearch: isWebPlatform ? undefined : onSubmitSearch,
    onOpenFilters,
    isFilterActive: dappSearchParams.category !== 'show all',
    items,
    listScrollResetKey,
    onSelectDapp,
    testID: 'dapp-explorer-page',
    customUrlDisclaimer: {
      visible: pendingExternalUrl !== null,
      url: pendingExternalUrl,
      onConfirm: onAcknowledgeWarning,
      onCancel: onDismissWarning,
    },
  };
};
