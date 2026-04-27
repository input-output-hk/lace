import { inferStoreContext } from '@lace-contract/module';

import { migrateV1Actions, migrateV1Selectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: migrateV1Actions,
    selectors: migrateV1Selectors,
  },
});
