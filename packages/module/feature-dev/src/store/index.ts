import { inferStoreContext } from '@lace-contract/module';

import { setFeatureFlags } from './actions';

// eslint-disable-next-line unicorn/prevent-abbreviations
export const featureDevActions = { featureDev: { setFeatureFlags } };

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: featureDevActions,
    selectors: {},
  },
});
