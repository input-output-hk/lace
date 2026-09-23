import { inferStoreContext } from '@lace-contract/module';

import { realfiStakingActions, realfiStakingSelectors } from './slice';

export { realfiStakingActions, realfiStakingSelectors } from './slice';
export type { RealFiStakingStoreState } from './slice';
export type * from './types';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: realfiStakingActions,
    selectors: realfiStakingSelectors,
  },
});
