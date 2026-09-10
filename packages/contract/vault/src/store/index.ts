import { inferStoreContext } from '@lace-contract/module';

import { vaultActions, vaultSelectors } from './slice';
export { vaultActions } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: vaultActions,
    selectors: vaultSelectors,
  },
});
