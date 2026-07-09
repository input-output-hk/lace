import { inferStoreContext } from '@lace-contract/module';

import { onlineStatusActions, onlineStatusSelectors } from './slice';
export { onlineStatusActions, onlineStatusSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: onlineStatusActions,
    selectors: onlineStatusSelectors,
  },
});
