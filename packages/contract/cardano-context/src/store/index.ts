import { inferStoreContext } from '@lace-contract/module';

import { cardanoContextActions, cardanoContextSelectors } from './slice';

export type * from './side-effects';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoContextActions,
    selectors: cardanoContextSelectors,
  },
});

export { cardanoContextActions, cardanoContextSelectors } from './slice';
export type * from './slice';
export * from './collateral-flow';
export * from './composer-flow';
export * from './night-designation-flow';
export * from './night-designation-index';
