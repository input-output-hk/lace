import { inferStoreContext } from '@lace-contract/module';

import { cardanoHostPullActions, cardanoHostPullSelectors } from './slice';

export type * from './dependencies';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoHostPullActions,
    selectors: cardanoHostPullSelectors,
  },
});
