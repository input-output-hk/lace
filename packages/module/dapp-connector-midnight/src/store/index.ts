import { inferStoreContext } from '@lace-contract/module';

import {
  midnightDappConnectorActions,
  midnightDappConnectorSelectors,
} from './slice';
export type { MidnightDappConnectorState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: midnightDappConnectorActions,
    selectors: midnightDappConnectorSelectors,
  },
});
