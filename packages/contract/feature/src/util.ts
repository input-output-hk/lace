import {
  assertModuleCompatibility,
  type Environment,
  type LaceModule,
  type SideEffectDependencies,
} from '@lace-contract/module';
import { getObservability } from '@lace-lib/observability';
import pick from 'lodash/pick';

import type { FeatureFlag, Features } from './types';

export const filterModules = (
  allModules: readonly LaceModule[],
  featureFlags: readonly FeatureFlag[],
  environment: Environment,
) => {
  return allModules.filter(
    m => !m.feature || m.feature.willLoad(featureFlags, environment),
  );
};

export const featureFlagsToFeatures =
  (allModules: readonly LaceModule[]) =>
  (featureFlags: FeatureFlag[], environment: Environment): Features => {
    const newModules = filterModules(allModules, featureFlags, environment);
    const modules = newModules.map(m => ({
      ...pick(m, 'moduleName'),
      feature: m.feature ? pick(m.feature, 'metadata') : undefined,
    }));
    return {
      featureFlags: featureFlags,
      modules,
    };
  };

export const selectModules = (
  availableModules: LaceModule[],
  featureFlags: FeatureFlag[],
  environment: Environment,
) => {
  const featuresToLoad = featureFlagsToFeatures(availableModules)(
    featureFlags,
    environment,
  );
  const modulesToLoad = availableModules.filter(m =>
    featuresToLoad.modules.some(
      ({ moduleName }) => moduleName === m.moduleName,
    ),
  );
  assertModuleCompatibility(modulesToLoad);
  return { featuresToLoad, modulesToLoad };
};

type SelectModulesWithFallbackProps = {
  availableModules: LaceModule[];
  featureFlags: FeatureFlag[];
  defaultFeatureFlags: FeatureFlag[];
  environment: Environment;
};

export const selectModulesWithFallback = ({
  availableModules,
  featureFlags,
  defaultFeatureFlags,
  environment,
}: SelectModulesWithFallbackProps) => {
  try {
    return {
      ...selectModules(availableModules, featureFlags, environment),
      usedFallback: false,
    };
  } catch (error) {
    getObservability().captureException(error as Error, {
      tags: { source: 'feature-flag-fallback' },
      extra: {
        attemptedFlags: featureFlags,
        defaultFlags: defaultFeatureFlags,
      },
    });
    return {
      ...selectModules(availableModules, defaultFeatureFlags, environment),
      usedFallback: true,
    };
  }
};

export const createFeatureFlagStorage = (
  storageFactory: SideEffectDependencies['createDocumentStorage'],
) =>
  storageFactory<{ featureFlags: FeatureFlag[] }>({
    documentId: 'featureFlags',
  });
