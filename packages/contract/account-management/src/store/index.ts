import { inferStoreContext } from '@lace-contract/module';

import { accountManagementActions, accountManagementSelectors } from './slice';

export { accountManagementActions } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: accountManagementActions,
    selectors: accountManagementSelectors,
  },
});
