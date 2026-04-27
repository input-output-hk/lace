import { inferStoreContext } from '@lace-contract/module';

import { failuresActions, failuresSelectors } from './slice';
export { failuresActions, failuresSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: failuresActions,
    selectors: failuresSelectors,
  },
});
