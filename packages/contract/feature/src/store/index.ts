import { inferStoreContext } from '@lace-contract/module';

import { featuresActions, featuresSelectors } from './slice';
export { featuresActions, featuresSelectors } from './slice';

export type { FeaturesSliceState, FeaturesStoreState } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: featuresActions,
    selectors: featuresSelectors,
  },
});
