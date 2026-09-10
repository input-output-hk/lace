import { inferStoreContext } from '@lace-contract/module';

import { midnightSyncActions } from './actions';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: midnightSyncActions,
    selectors: {},
  },
});
