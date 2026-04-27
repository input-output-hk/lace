import { inferStoreContext } from '@lace-contract/module';

import {
  midnightDappConnectorActions,
  midnightDappConnectorSelectors,
} from './slice';

export default inferStoreContext({
  load: async () => import('./init-lace-extension'),
  context: {
    actions: midnightDappConnectorActions,
    selectors: midnightDappConnectorSelectors,
  },
});
