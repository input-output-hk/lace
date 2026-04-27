import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
  type ContractSelectors,
  type ContractActionCreators,
  type LaceSideEffect,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

export const tokensStoreContract = inferContractContext({
  name: ContractName('tokens-store'),
  contractType: 'store',
  dependsOn: combineContracts([
    storageDependencyContract,
    // TODO: technically it depends on networkStoreContract contract via selectors,
    // but doing it results in this error:
    //
    // > npx nx run @lace-module/app-mobile:type-check-test
    // src/addons/loadStackPages.tsx:6:23 - error TS2589: Type instantiation is excessively deep and possibly infinite.
    //
    // networkStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
  instance: 'at-least-one',
});

export type Selectors = ContractSelectors<typeof tokensStoreContract>;
export type ActionCreators = ContractActionCreators<typeof tokensStoreContract>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
