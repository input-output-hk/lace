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
} from '@lace-contract/module';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('crypto-cardano-sdk'),
  implements: combineContracts([cryptoAddonContract] as const),
  addons: {
    bip32Ed25519: async () => import('./bip32ed25519'),
    blake2b: async () => import('./blake2b'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
