import { combineContracts } from '@lace-contract/module';
import { createContextualUseLoadModules } from '@lace-lib/util-render';

import {
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
} from '../contract';

import type { ModuleAddons } from '@lace-contract/module';

const _implementsContracts = combineContracts([] as const);
const _dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
] as const);

type AvailableAddons = ModuleAddons<
  typeof _implementsContracts,
  typeof _dependsOnContracts
>;

export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();
