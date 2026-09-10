import { inferStoreContext } from '@lace-contract/module';

import { earnRewardsActions, earnRewardsSelectors } from './slice';

export { earnRewardsActions, earnRewardsSelectors } from './slice';

export type * from './types';
export type { EarnRewardsStoreState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: earnRewardsActions,
    selectors: earnRewardsSelectors,
  },
});
