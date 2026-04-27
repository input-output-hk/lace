import { inferStoreContext } from '@lace-contract/module';

import {
  cardanoDappConnectorActions,
  cardanoDappConnectorSelectors,
} from '../../common/store/slice';

/**
 * Mobile store context for the Cardano dApp connector.
 *
 * Provides lazy-loaded store initialization with mobile-specific actions and selectors.
 * The store manages:
 * - WebView message processing for CIP-30 requests
 * - Mobile authentication flow for signing operations
 * - Session-based dApp authorization
 */
export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoDappConnectorActions,
    selectors: cardanoDappConnectorSelectors,
  },
});
