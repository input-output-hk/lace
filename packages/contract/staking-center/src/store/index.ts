import { inferStoreContext } from '@lace-contract/module';

import { stakingCenterActions, stakingCenterSelectors } from './slice';

export { stakingCenterActions, stakingCenterSelectors } from './slice';

export type * from './types';
export type * from './deregistration-types';
export type { StakingCenterStoreState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: stakingCenterActions,
    selectors: stakingCenterSelectors,
  },
});
