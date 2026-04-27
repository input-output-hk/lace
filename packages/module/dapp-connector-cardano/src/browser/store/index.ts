import { inferStoreContext } from '@lace-contract/module';

import {
  cardanoDappConnectorActions,
  cardanoDappConnectorSelectors,
} from '../../common/store/slice';

/**
 * Extension store context configuration for the Cardano dApp connector.
 *
 * @returns Store context with lazy-loaded initialization and pre-configured actions/selectors
 */
export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoDappConnectorActions,
    selectors: cardanoDappConnectorSelectors,
  },
});
