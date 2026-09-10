import { inferStoreContext } from '@lace-contract/module';

import {
  bitcoinDappConnectorActions,
  bitcoinDappConnectorSelectors,
} from './slice';

/**
 * Extension store context for the Bitcoin dApp connector, splitting the
 * lazily loaded store initialization from the eagerly available actions and
 * selectors.
 */
export default inferStoreContext({
  load: async () => import('./init-lace-extension'),
  context: {
    actions: bitcoinDappConnectorActions,
    selectors: bitcoinDappConnectorSelectors,
  },
});
