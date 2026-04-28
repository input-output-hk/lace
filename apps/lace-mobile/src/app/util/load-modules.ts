import {
  loadCreateFeatureFlagStorage,
  selectModulesWithFallback,
} from '@lace-contract/feature';
import { createModuleLoader } from '@lace-contract/module';
import { loadCreateDocumentStorage } from '@lace-module/storage-react-native-async';
import { Platform } from 'react-native';
import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import defaultFeatureFlags from '../feature-flags';

import { allModules } from './all-modules';
import { appConfig, ENV } from './config';
import { logger } from './logger';

import type { FeatureFlag } from '@lace-contract/feature';
import type {
  Action,
  CreateLoaderProps,
  CreateStoreProps,
  LaceModule,
  LacePlatform,
  State,
  ViewId,
} from '@lace-contract/module';
import '@lace-contract/app';
import type { Store, StoreEnhancer } from '@reduxjs/toolkit';

const getFeatureFlags = async (): Promise<FeatureFlag[]> => {
  const createFeatureFlagStorage = await loadCreateFeatureFlagStorage();
  const createDocumentStorage = await loadCreateDocumentStorage();
  const featureFlagStorage = createFeatureFlagStorage(props =>
    createDocumentStorage(props, { logger }),
  );

  return firstValueFrom(
    featureFlagStorage.get().pipe(
      map(({ featureFlags }) => featureFlags),
      // Fallback to compile-time default flags; avoid referencing appConfig (can be null at type-level)
      defaultIfEmpty(defaultFeatureFlags),
    ),
  );
};

export type CreateModuleLoaderProps = {
  view: {
    id: ViewId;
    store: Store<State, Action>;
  };
};

export const createFeatureFlagModuleLoader = async ({
  availableModules = allModules,
  featureFlags,
  viewId,
  storeEnhancer,
}: {
  availableModules?: LaceModule[];
  featureFlags: FeatureFlag[];
  viewId: ViewId;
  storeEnhancer?: StoreEnhancer;
}): Promise<CreateLoaderProps & CreateStoreProps> => {
  const { featuresToLoad, modulesToLoad } = selectModulesWithFallback({
    availableModules,
    featureFlags,
    defaultFeatureFlags: appConfig!.defaultFeatureFlags,
    environment: ENV,
  });
  const features = { loaded: featuresToLoad, availableModules };
  const runtime = {
    app: 'lace-mobile' as const,
    env: ENV,
    features,
    // Non-null assertion: App only initializes modules when config is valid
    config: appConfig!,
    platform: Platform.OS as LacePlatform,
  };
  const moduleInitProps = {
    modules: modulesToLoad,
    runtime,
    viewId,
  };
  const loadModules = createModuleLoader(moduleInitProps, { logger });
  return {
    lastEnhancer: storeEnhancer,
    loadModules,
    ...moduleInitProps,
  };
};

export const createMobileModuleLoader = async (
  viewId: ViewId,
  storeEnhancer: StoreEnhancer | undefined,
) => {
  const featureFlags = await getFeatureFlags();

  const defaultKeys = defaultFeatureFlags.map(f => f.key);
  const loadedKeys = featureFlags.map(f => f.key);
  const missingFromPostHog = defaultKeys.filter(k => !loadedKeys.includes(k));
  const extraInPostHog = loadedKeys.filter(k => !defaultKeys.includes(k));

  logger.debug('Feature flags — from storage (PostHog):', loadedKeys);
  logger.debug('Feature flags — defaults:', defaultKeys);
  logger.debug('Feature flags — missing from PostHog:', missingFromPostHog);
  logger.debug('Feature flags — extra in PostHog:', extraInPostHog);

  try {
    return await createFeatureFlagModuleLoader({
      availableModules: allModules,
      featureFlags,
      viewId,
      storeEnhancer,
    });
  } catch (error) {
    const flagComparison = [
      `PostHog flags (${loadedKeys.length}): ${
        loadedKeys.join(', ') || '(none)'
      }`,
      `Default flags (${defaultKeys.length}): ${defaultKeys.join(', ')}`,
      `Missing from PostHog: ${missingFromPostHog.join(', ') || '(none)'}`,
      `Extra in PostHog: ${extraInPostHog.join(', ') || '(none)'}`,
    ].join('\n');

    const baseMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${baseMessage}\n\n--- Flag Comparison ---\n${flagComparison}`,
      { cause: error },
    );
  }
};
