import { inferStoreContext } from '@lace-contract/module';

import { migrateWalletActions, migrateWalletSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: migrateWalletActions,
    selectors: migrateWalletSelectors,
  },
});
