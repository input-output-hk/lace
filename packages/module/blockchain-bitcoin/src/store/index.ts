import { inferStoreContext } from '@lace-contract/module';

import { bitcoinContextActions, bitcoinContextSelectors } from './slice';

export * from './side-effects';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: bitcoinContextActions,
    selectors: bitcoinContextSelectors,
  },
});

export { bitcoinContextActions, bitcoinContextSelectors } from './slice';
export type * from './slice';
