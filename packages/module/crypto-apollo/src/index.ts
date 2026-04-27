import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([cryptoAddonContract] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('crypto-apollo'),
  implements: implementsContracts,
  addons: {
    bip32Ed25519: async () => import('./bip32Ed25519'),
    blake2b: async () => import('./blake2b'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
