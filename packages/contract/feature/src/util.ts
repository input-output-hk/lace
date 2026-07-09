import {
  assertModuleCompatibility,
  type Environment,
  type LaceModule,
  type SideEffectDependencies,
} from '@lace-contract/module';
import { getObservability } from '@lace-lib/observability';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';

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
      fallback: undefined,
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
      fallback: { incompatibleFlags: featureFlags },
    };
  }
};

export const featureFlagSetEquals = (
  a: readonly FeatureFlag[] | undefined,
  b: readonly FeatureFlag[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return isEqual(sortBy(a, 'key'), sortBy(b, 'key'));
};

export const createFeatureFlagStorage = (
  storageFactory: SideEffectDependencies['createDocumentStorage'],
) =>
  storageFactory<{ featureFlags: FeatureFlag[] }>({
    documentId: 'featureFlags',
  });
