import { inferStoreContext } from '@lace-contract/module';

import { analyticsActions, analyticsSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: analyticsActions,
    selectors: analyticsSelectors,
  },
});

export type * from './slice';
export { analyticsActions, analyticsSelectors } from './slice';
