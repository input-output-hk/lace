import { inferStoreContext } from '@lace-contract/module';

import { addressesActions, addressesSelectors } from './slice';
export {
  addressesActions,
  addressesReducers,
  addressesSelectors,
} from './slice';
export type {
  AddressAliasEntry,
  AddressesSliceState,
  AddressesStoreState,
  UpsertAddressesPayload,
} from './slice';
export * from './utils';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: addressesActions,
    selectors: addressesSelectors,
  },
});
