import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  posthogDependencyContract,
  type PostHogClient,
  type PostHogRelatedSideEffectDependencies,
} from '@lace-contract/posthog';

import type { LaceModuleMap } from '@lace-contract/module';

const stubPosthogClient: PostHogClient = {
  captureEvent: () => {},
  // `feature-posthog`'s polling loop filters out empty responses
  // (`filter(featureFlags => featureFlags.length > 0)`), so returning
  // an empty `featureFlags` object idles the loop with no dispatches.
  getFeatureFlags: async () => ({
    featureFlags: {},
    featureFlagPayloads: {},
  }),
  identify: () => {},
};

const store = {
  context: {
    actions: {},
    selectors: {},
  },
  load: async () => ({
    default: async () => ({
      sideEffectDependencies: {
        posthog: stubPosthogClient,
        getDefaultPostHogEventProperties: () => ({}),
      } as PostHogRelatedSideEffectDependencies,
    }),
  }),
};

const sharedModule = inferModuleContext({
  moduleName: ModuleName('posthog-client-react-native'),
  implements: combineContracts([posthogDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export const stubPosthogClientModule = moduleMap;
