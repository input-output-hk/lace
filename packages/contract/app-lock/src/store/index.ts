import { inferStoreContext } from '@lace-contract/module';

import { appLockActions, appLockSelectors } from './slice';
export { appLockActions, appLockSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: appLockActions,
    selectors: appLockSelectors,
  },
});
