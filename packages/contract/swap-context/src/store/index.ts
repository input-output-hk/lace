import { inferStoreContext } from '@lace-contract/module';

import { swapContextActions, swapContextSelectors } from './slice';
export { swapContextActions, swapContextSelectors } from './slice';

export type * from './slice';
export type * from './types';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: swapContextActions,
    selectors: swapContextSelectors,
  },
});
