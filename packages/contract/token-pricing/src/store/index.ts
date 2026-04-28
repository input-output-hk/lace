import { inferStoreContext } from '@lace-contract/module';

import { tokenPricingSliceSelectors } from './selectors';
import { tokenPricingActions } from './slice';

export { tokenPricingActions } from './slice';
export { selectPortfolioValueHistory } from './selectors';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: tokenPricingActions,
    selectors: tokenPricingSliceSelectors,
  },
});
