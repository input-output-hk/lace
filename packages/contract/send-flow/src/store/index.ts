import { inferStoreContext } from '@lace-contract/module';

import { sendFlowActions, sendFlowSelectors } from './slice';

const store = inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: sendFlowActions,
    selectors: sendFlowSelectors,
  },
});

export default store;

export type { SendFlowSliceState, SendFlowStoreState } from './slice';
export { sendFlowActions, sendFlowSelectors } from './slice';
export * from './utils';
