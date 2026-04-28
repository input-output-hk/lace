import { inferStoreContext } from '@lace-contract/module';

import { activitiesActions, activitiesSelectors } from './slice';

export type * from './slice';

export { activitiesActions, activitiesSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: activitiesActions,
    selectors: activitiesSelectors,
  },
});
