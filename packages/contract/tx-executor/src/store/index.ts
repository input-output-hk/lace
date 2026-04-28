import { inferStoreContext } from '@lace-contract/module';

import { txExecutorActions } from './slice';

export * from './entry-point';

export { genericErrorResults } from './generic-error-results';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: txExecutorActions,
  },
});
