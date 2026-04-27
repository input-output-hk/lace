import { inferStoreContext } from '@lace-contract/module';

import { secureStoreActions, secureStoreSelectors } from './slice';
export { secureStoreActions, secureStoreSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: secureStoreActions,
    selectors: secureStoreSelectors,
  },
});
