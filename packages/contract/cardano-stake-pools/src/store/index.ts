import { inferStoreContext } from '@lace-contract/module';

import { cardanoStakePoolsActions, cardanoStakePoolsSelectors } from './slice';

export * from './slice';
export * from './utils';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoStakePoolsActions,
    selectors: cardanoStakePoolsSelectors,
  },
});
