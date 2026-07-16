import { inferStoreContext } from '@lace-contract/module';

import { governanceCenterActions, governanceCenterSelectors } from './slice';

export { governanceCenterActions, governanceCenterSelectors } from './slice';

export type * from './types';
export type {
  DRepSortBy,
  DRepStatus,
  GovernanceCenterStoreState,
} from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: governanceCenterActions,
    selectors: governanceCenterSelectors,
  },
});
