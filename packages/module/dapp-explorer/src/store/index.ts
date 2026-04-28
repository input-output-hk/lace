import { inferStoreContext } from '@lace-contract/module';

export type * from './init';

import { dappExplorerActions, dappExplorerSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: dappExplorerActions,
    selectors: dappExplorerSelectors,
  },
});
