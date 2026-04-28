import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';

import store from './store';

export const walletRepoStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('wallet-repo-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([networkStoreContract]),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export const vaultContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('vault'),
  instance: 'at-least-one',
});
