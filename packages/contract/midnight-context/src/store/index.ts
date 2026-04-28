import { inferStoreContext } from '@lace-contract/module';

import { midnightContextActions, midnightContextSelectors } from './slice';
export { midnightContextActions, midnightContextSelectors } from './slice';
export type {
  MidnightContextSliceState,
  MidnightContextStoreState,
} from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: midnightContextActions,
    selectors: midnightContextSelectors,
  },
});
