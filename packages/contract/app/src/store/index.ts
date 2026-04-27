import { inferStoreContext } from '@lace-contract/module';

import { appActions, uiActions } from './slice';
export { appActions, uiActions } from './slice';
export type * from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: {
      ...appActions,
      ...uiActions,
    },
  },
});
