import { inferStoreContext } from '@lace-contract/module';

import { cardanoUriLinkingActions, cardanoUriLinkingSelectors } from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: cardanoUriLinkingActions,
    selectors: cardanoUriLinkingSelectors,
  },
});
