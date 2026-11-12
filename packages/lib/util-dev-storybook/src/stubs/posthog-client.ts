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
  // Stories own the flags; an incomplete response leaves their set unchanged.
  getFeatureFlags: async () => ({}),
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
