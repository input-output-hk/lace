import { inferStoreContext } from '@lace-contract/module';

import { tokensActions, tokensSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: tokensActions,
    selectors: tokensSelectors,
  },
});

export type * from './slice';
export type * from './types';
export {
  tokensActions,
  tokensSelectors,
  reducers,
  createRawToken,
  createToken,
} from './slice';
