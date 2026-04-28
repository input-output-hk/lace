// TODO: Once the collateral UI (useCollateralState, CollateralSheet) is moved
// here from @lace-module/blockchain-cardano-ui, also move the slice, types,
// and state-machine from @lace-contract/cardano-context/store/collateral-flow
// into this module. That will fully decouple collateral-flow from the contract.
import {
  cardanoProviderStoreContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('cardano-collateral-flow'),
  implements: combineContracts([] as const),
  dependsOn: combineContracts([
    cardanoProviderStoreContract,
    txExecutorStoreContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'CardanoCollateralFlow',
      description: 'Cardano collateral UTXO management flow',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
