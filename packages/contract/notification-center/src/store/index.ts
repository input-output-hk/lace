import { inferStoreContext } from '@lace-contract/module';

import {
  notificationCenterActions,
  notificationCenterSelectors,
} from './slice';

export {
  notificationCenterActions,
  notificationCenterReducers,
  notificationCenterSelectors,
} from './slice';
export type * from './slice';
export type * from './types';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: notificationCenterActions,
    selectors: notificationCenterSelectors,
  },
});
