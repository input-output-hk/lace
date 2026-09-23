import { inferStoreContext } from '@lace-contract/module';

import { passportActions, passportSelectors } from './slice';

export { passportActions, passportSelectors } from './slice';
export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: passportActions,
    selectors: passportSelectors,
  },
});
