import { inferStoreContext } from '@lace-contract/module';

import { hwConnectorMobileActions, hwConnectorMobileSelectors } from './slice';

export { hwConnectorMobileActions, hwConnectorMobileSelectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: hwConnectorMobileActions,
    selectors: hwConnectorMobileSelectors,
  },
});
