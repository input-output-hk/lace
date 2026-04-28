import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { recoveryPhraseChannelExtensionContract } from '@lace-contract/recovery-phrase';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

// TODO: declare module dependencies and contract implementations
const implementsContracts = combineContracts([
  recoveryPhraseChannelExtensionContract,
] as const);
const dependsOnContracts = combineContracts([] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('recovery-phrase-channel-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadRecoveryPhraseChannelExtension: async () =>
      import('./addons/recovery-phrase-channel-extension'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
