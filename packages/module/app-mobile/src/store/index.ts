import { inferStoreContext } from '@lace-contract/module';

import { uiActions, uiSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: uiActions,
    selectors: uiSelectors,
  },
});
