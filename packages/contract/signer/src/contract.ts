import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

export const signerFactoryAddonContract = inferContractContext({
  name: ContractName('signer-factory-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadSignerFactory'],
  },
});

export const signerStoreContract = inferContractContext({
  name: ContractName('signer-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([signerFactoryAddonContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});
