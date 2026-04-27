import { inferStoreContext } from '@lace-contract/module';

import { midnightActions, midnightSelectors as sliceSelectors } from './slice';

export const midnightSelectors = {
  midnight: {
    ...sliceSelectors.midnight,
  },
};

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: midnightActions,
    selectors: midnightSelectors,
  },
});
