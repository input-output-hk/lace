import { inferStoreContext } from '@lace-contract/module';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: {},
    selectors: {},
  },
});
