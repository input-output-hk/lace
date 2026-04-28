import { inferStoreContext } from '@lace-contract/module';

import {
  migrateMultiDelegationActions,
  migrateMultiDelegationSelectors,
} from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: migrateMultiDelegationActions,
    selectors: migrateMultiDelegationSelectors,
  },
});
