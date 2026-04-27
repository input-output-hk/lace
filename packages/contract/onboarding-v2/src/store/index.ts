import { inferStoreContext } from '@lace-contract/module';

import { onboardingV2Actions, onboardingV2Selectors } from './slice';
export { onboardingV2Actions, onboardingV2Selectors } from './slice';

export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: onboardingV2Actions,
    selectors: onboardingV2Selectors,
  },
});
