import { inferStoreContext } from '@lace-contract/module';

import { customDappsActions, customDappsSelectors } from './slice';
export { customDappsActions, customDappsSelectors } from './slice';

export type * from './types';
export type { CustomDappsStoreState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: customDappsActions,
    selectors: customDappsSelectors,
  },
});
