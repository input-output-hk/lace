/* eslint-disable @typescript-eslint/no-require-imports */
import { inferStoreContext } from '@lace-contract/module';

import { uiActions, uiSelectors } from './slice';

export default inferStoreContext({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  load: async () => require('./init'),
  context: {
    actions: uiActions,
    selectors: uiSelectors,
  },
});
