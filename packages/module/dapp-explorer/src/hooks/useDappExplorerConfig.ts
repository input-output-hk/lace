import { useMemo } from 'react';
import { Platform } from 'react-native';

import { FEATURE_FLAG_DAPP_EXPLORER } from '../const';

import { useLaceSelector } from './lace-context';

import type { FeatureFlag } from '@lace-contract/feature';

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

export type DappExplorerConfig = {
  disallowedSlugs: string[];
  disallowedCategories: string[];
  alwaysVisibleSlugs: string[];
  showStatistics: boolean;
};

export const getCurrentPlatform = (): PlatformKey => {
  const os = Platform.OS;
  if (os === 'ios') return 'ios';
  if (os === 'android') return 'android';
  return 'web';
};

const findDappExplorerFlag = (
  featureFlags: readonly FeatureFlag[] | undefined,
): FeatureFlag<DappExplorerPayload> | undefined =>
  featureFlags?.find(flag => flag.key === FEATURE_FLAG_DAPP_EXPLORER) as
    | FeatureFlag<DappExplorerPayload>
    | undefined;

const flattenGroups = (
  ...groups: Array<Record<string, string[]> | undefined>
): string[] => groups.flatMap(group => Object.values(group ?? {}).flat());

/**
 * Returns the DAPP_EXPLORER filter configuration with global and
 * platform-specific groups merged, preferring flags fetched during the
 * current session over the boot-time snapshot. On a cold run (clean install)
 * the boot snapshot only contains compile-time defaults; the remote payload
 * arrives shortly after in `features.next`, and reading it here lets the
 * explorer re-filter its list without an app reload.
 */
export const useDappExplorerConfig = (): DappExplorerConfig => {
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');
  const nextFeatureFlags = useLaceSelector('features.selectNextFeatureFlags');

  return useMemo(() => {
    // Fall back per-payload, not per-flag: PostHog can emit a key-only flag
    // with no payload, which must not wipe the boot snapshot's filters.
    const payload =
      findDappExplorerFlag(nextFeatureFlags?.features)?.payload ??
      findDappExplorerFlag(loadedFeatures?.featureFlags)?.payload;
    const platform = payload?.[getCurrentPlatform()];

    return {
      disallowedSlugs: flattenGroups(
        payload?.disallowedDapps,
        platform?.disallowedDapps,
      ),
      disallowedCategories: flattenGroups(
        payload?.disallowedCategories,
        platform?.disallowedCategories,
      ),
      alwaysVisibleSlugs: [
        ...(payload?.alwaysVisibleSlugs ?? []),
        ...(platform?.alwaysVisibleSlugs ?? []),
      ],
      showStatistics: payload?.showStatistics ?? false,
    };
  }, [loadedFeatures, nextFeatureFlags]);
};
