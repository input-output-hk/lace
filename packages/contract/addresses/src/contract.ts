import {
  ContractName,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

export const addressesStoreContract = inferContractContext({
  name: ContractName('addresses-store'),
  contractType: 'store',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
  instance: 'at-least-one',
});

export const addressAliasResolverAddonContract = inferContractContext({
  name: ContractName('addresses-alias-resolver-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadAddressAliasResolver'],
  },
});
