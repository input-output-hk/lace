import { inferStoreContext } from '@lace-contract/module';

import { migrateMonolithGuestDataActions } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: migrateMonolithGuestDataActions,
    selectors: {},
  },
});
