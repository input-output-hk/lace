import { inferStoreContext } from '@lace-contract/module';

import { actions, selectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: { actions, selectors },
});
