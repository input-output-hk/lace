import { inferStoreContext } from '@lace-contract/module';

import { networkActions, networkSelectors } from './slice';
export { networkActions, networkSelectors } from './slice';

export type * from './slice';
export type * from './types';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: networkActions,
    selectors: networkSelectors,
  },
});
