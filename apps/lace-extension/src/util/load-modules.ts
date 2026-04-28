import {
  loadCreateFeatureFlagStorage,
  selectModulesWithFallback,
} from '@lace-contract/feature';
import { createModuleLoader } from '@lace-contract/module';
import { loadCreateDocumentStorage } from '@lace-module/storage-extension';
import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import { allModules } from './all-modules';
import { ENV, appConfig } from './config';
import { logger } from './logger';

import type { FeatureFlag, Features } from '@lace-contract/feature';
import '@lace-contract/app';
import type {
  Action,
  CreateLoaderProps,
  LaceModule,
  ModuleInitProps,
  Runtime,
  State,
  ViewId,
} from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

const withExtraFeatureFlags = (featureFlags: FeatureFlag[]): FeatureFlag[] => {
  const missingFlags = appConfig.extraFeatureFlags.filter(
    extraFlagKey => !featureFlags.some(ff => ff.key === extraFlagKey),
  );
  return [...featureFlags, ...missingFlags.map(key => ({ key }))];
};

const getFeatureFlags = async (
  remoteStore?: Readonly<Store<State, Action>>,
) => {
  if (!remoteStore) {
    const createFeatureFlagStorage = await loadCreateFeatureFlagStorage();
    const createDocumentStorage = await loadCreateDocumentStorage();
    const featureFlagStorage = createFeatureFlagStorage(props =>
      createDocumentStorage(props, { logger }),
    );

    return firstValueFrom(
      featureFlagStorage.get().pipe(
        map(({ featureFlags }) => featureFlags),
        defaultIfEmpty(appConfig.defaultFeatureFlags),
        map(withExtraFeatureFlags),
      ),
    );
  }

  // views must get feature flags from service worker
  const getStoredFeatureFlags = () => {
    const loadedFeatures = remoteStore.getState().features.loaded;
    if (loadedFeatures.modules.length > 0) {
      return loadedFeatures.featureFlags;
    }
  };

  return (
    getStoredFeatureFlags() ||
    new Promise<FeatureFlag[]>(resolve => {
      const unsubscribe = remoteStore.subscribe(() => {
        const featureFlags = getStoredFeatureFlags();
        if (featureFlags) {
          unsubscribe();
          resolve(featureFlags);
        }
      });
    })
  );
};

type CreateExtensionModuleLoaderProps = {
  view: {
    id: ViewId;
    remoteStore: Store<State, Action>;
  };
};

export const createFeatureFlagModuleLoader = async (
  availableModules: LaceModule[],
  featureFlags: FeatureFlag[],
  viewId?: ViewId,
): Promise<
  CreateLoaderProps &
    ModuleInitProps & {
      featureFlags: FeatureFlag[];
    }
> => {
  const { featuresToLoad, modulesToLoad } = selectModulesWithFallback({
    availableModules,
    featureFlags,
    defaultFeatureFlags: appConfig.defaultFeatureFlags,
    environment: ENV,
  });
  const features = { loaded: featuresToLoad, availableModules };
  const runtime = {
    app: 'lace-extension' as const,
    env: ENV,
    features,
    config: appConfig,
    platform: 'web-extension' as const,
  };
  const createLoaderProps = {
    modules: modulesToLoad,
    runtime,
    viewId,
  };

  return {
    loadModules: createModuleLoader(createLoaderProps, { logger }),
    featureFlags,
    ...createLoaderProps,
  };
};

export const createContentScriptModuleLoader = () => {
  const loaded: Features = {
    featureFlags: [],
    modules: allModules,
  };
  const runtime: Runtime = {
    app: 'lace-extension' as const,
    env: ENV,
    features: { availableModules: allModules, loaded },
    config: appConfig,
    platform: 'web-extension' as const,
  };
  return createModuleLoader({ modules: allModules, runtime }, { logger });
};

export const createExtensionModuleLoader = async (
  props?: Readonly<CreateExtensionModuleLoaderProps>,
) => {
  const featureFlags = await getFeatureFlags(props?.view.remoteStore);
  logger.debug('Feature flags', featureFlags);
  const viewId = props?.view.id;
  return createFeatureFlagModuleLoader(allModules, featureFlags, viewId);
};
