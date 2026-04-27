import { inferStoreContext } from '@lace-contract/module';

import { addressBookActions, addressBookSelectors } from './slice';
export { addressBookActions, addressBookSelectors } from './slice';

export type * from './types';
export type { AddressBookStoreState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: addressBookActions,
    selectors: addressBookSelectors,
  },
});
