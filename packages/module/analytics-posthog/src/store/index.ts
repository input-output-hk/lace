import { inferStoreContext } from '@lace-contract/module';

import { posthogAnalyticsActions, posthogAnalyticsSelectors } from './slice';

export type * from './dependencies';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: posthogAnalyticsActions,
    selectors: posthogAnalyticsSelectors,
  },
});
